import { Linking, Platform } from "react-native";

import * as WebBrowser from "expo-web-browser";

import { describeOAuthUrl, logAuth, logAuthError } from "@/lib/auth-log";
import { getQueryParams } from "@/lib/query-params";
import { supabase } from "@/lib/supabase";

const TIMEOUT_MS = 120_000;
const DISMISS_GRACE_MS = Platform.OS === "android" ? 30_000 : 10_000;

export class OAuthCanceledError extends Error {
  name = "OAuthCanceledError";
}

WebBrowser.maybeCompleteAuthSession();

/** Supabase Redirect URLs에 동일하게 등록 */
export const OAUTH_REDIRECT_URI = "vlpmp://sign-in";

const redirectPrefix = (redirectUrl: string) => redirectUrl.split("?")[0].split("#")[0];

const hasOAuthCallbackParams = (url: string) => {
  const { params, errorCode } = getQueryParams(url);
  if (params.error || errorCode) return true;
  if (params.code) return true;
  return Boolean(params.access_token && params.refresh_token);
};

export const isOAuthCallbackUrl = (url: string, redirectUrl = OAUTH_REDIRECT_URI) => {
  if (url.startsWith(redirectPrefix(redirectUrl))) return true;
  // Android Custom Tabs often deliver `vlpmp:?code=...` (host/path stripped).
  if (/^vlpmp:/i.test(url) && hasOAuthCallbackParams(url)) return true;
  return false;
};

const hasCallback = (url: string) => hasOAuthCallbackParams(url);

const dismissBrowser = () => {
  try {
    WebBrowser.dismissAuthSession();
  } catch (error) {
    logAuthError("dismissAuthSession.skipped", error);
  }
  if (Platform.OS !== "android") {
    try {
      WebBrowser.dismissBrowser();
    } catch (error) {
      logAuthError("dismissBrowser.skipped", error);
    }
  }
};

export const createSessionFromUrl = async (url: string) => {
  logAuth("createSessionFromUrl.start", describeOAuthUrl(url));
  const { params, errorCode } = getQueryParams(url);
  if (params.error || errorCode) {
    logAuth("createSessionFromUrl.providerError", {
      error: params.error ?? errorCode,
    });
    throw new Error("구글 로그인에 실패했습니다.");
  }

  if (params.access_token && params.refresh_token) {
    logAuth("createSessionFromUrl.setSession");
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) {
      logAuthError("createSessionFromUrl.setSession.failed", error);
      throw error;
    }
    if (!data.session) throw new Error("세션을 만들지 못했습니다.");
    logAuth("createSessionFromUrl.ok", { userId: data.session.user.id });
    return data.session;
  }

  if (!params.code) {
    logAuth("createSessionFromUrl.missingCode", describeOAuthUrl(url));
    throw new Error("로그인 코드가 없습니다.");
  }

  logAuth("createSessionFromUrl.exchangeCode");
  const exchanged = await supabase.auth.exchangeCodeForSession(params.code);
  if (exchanged.error) {
    logAuthError("createSessionFromUrl.exchange.failed", exchanged.error);
    throw exchanged.error;
  }
  if (!exchanged.data.session) throw new Error("세션을 만들지 못했습니다.");
  logAuth("createSessionFromUrl.ok", { userId: exchanged.data.session.user.id });
  return exchanged.data.session;
};

export const handleOAuthCallbackUrl = async (url: string) => {
  logAuth("handleOAuthCallbackUrl", describeOAuthUrl(url));
  if (!isOAuthCallbackUrl(url)) {
    logAuth("handleOAuthCallbackUrl.skip", { reason: "notOAuthRedirect" });
    return null;
  }
  if (!hasCallback(url)) {
    logAuth("handleOAuthCallbackUrl.skip", { reason: "noCallbackParams" });
    return null;
  }
  const session = await createSessionFromUrl(url);
  dismissBrowser();
  return session;
};

export const signInWithGoogle = async (redirectTo: string) => {
  logAuth("signInWithGoogle.start", { redirectTo, platform: Platform.OS });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) {
    logAuthError("signInWithOAuth.failed", error);
    throw error;
  }
  if (!data.url) throw new Error("로그인을 시작하지 못했습니다.");
  logAuth("signInWithOAuth.ok", { authUrlLength: data.url.length });

  const callbackUrl = await waitForRedirect(data.url, redirectTo);
  if (getQueryParams(callbackUrl).params.recovered) {
    logAuth("signInWithGoogle.recoveredFromStorage");
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      logAuth("signInWithGoogle.ok", { userId: sessionData.session.user.id });
      return sessionData.session;
    }
  }
  const session = await createSessionFromUrl(callbackUrl);
  logAuth("signInWithGoogle.ok", { userId: session.user.id });
  return session;
};

const waitForRedirect = (authUrl: string, redirectUrl: string) =>
  new Promise<string>((resolve, reject) => {
    let settled = false;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;

    logAuth("waitForRedirect.start", { redirectUrl });

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      clearTimeout(timeout);
      if (dismissTimer) clearTimeout(dismissTimer);
      fn();
    };

    const resolveUrl = (url: string, source: string) => {
      logAuth("waitForRedirect.resolve", { source, ...describeOAuthUrl(url) });
      dismissBrowser();
      finish(() => resolve(url));
    };

    const tryUrl = (url?: string | null, source = "unknown") => {
      if (!url) return;
      logAuth("waitForRedirect.tryUrl", { source, ...describeOAuthUrl(url) });
      if (!isOAuthCallbackUrl(url, redirectUrl)) {
        logAuth("waitForRedirect.tryUrl.skip", { reason: "redirectMismatch" });
        return;
      }
      if (!hasCallback(url)) {
        logAuth("waitForRedirect.tryUrl.skip", { reason: "noCallbackParams" });
        return;
      }
      resolveUrl(url, source);
    };

    const rejectUnlessSession = async (reason: Error, source: string) => {
      const { data } = await supabase.auth.getSession();
      logAuth("waitForRedirect.rejectUnlessSession", {
        source,
        reason: reason.message,
        hasSession: Boolean(data.session),
        userId: data.session?.user.id ?? null,
      });
      if (data.session) {
        finish(() => resolve(`${redirectUrl}?recovered=1`));
        return;
      }
      finish(() => reject(reason));
    };

    const subscription = Linking.addEventListener("url", ({ url }) =>
      tryUrl(url, "Linking.addEventListener"),
    );
    const timeout = setTimeout(() => {
      logAuth("waitForRedirect.timeout");
      dismissBrowser();
      void rejectUnlessSession(new Error("로그인 시간이 초과되었습니다."), "timeout");
    }, TIMEOUT_MS);

    void Linking.getInitialURL().then(url =>
      tryUrl(url, "Linking.getInitialURL"),
    );
    void WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)
      .then(result => {
        logAuth("openAuthSessionAsync.result", {
          type: result.type,
          url: result.type === "success" ? describeOAuthUrl(result.url) : null,
        });
        if (result.type === "success" && result.url) {
          if (isOAuthCallbackUrl(result.url, redirectUrl) && hasCallback(result.url)) {
            resolveUrl(result.url, "openAuthSessionAsync.success");
          } else {
            logAuth("openAuthSessionAsync.success.waitingForLinking", {
              redirectMatch: isOAuthCallbackUrl(result.url, redirectUrl),
              hasCallback: hasCallback(result.url),
            });
          }
          return;
        }
        if (result.type === "cancel") {
          void rejectUnlessSession(
            new OAuthCanceledError("로그인을 취소했습니다."),
            "openAuthSessionAsync.cancel",
          );
          return;
        }
        if (result.type === "dismiss") {
          logAuth("openAuthSessionAsync.dismiss", { graceMs: DISMISS_GRACE_MS });
          dismissTimer = setTimeout(() => {
            void rejectUnlessSession(
              new OAuthCanceledError("로그인을 취소했습니다."),
              "openAuthSessionAsync.dismiss",
            );
          }, DISMISS_GRACE_MS);
        }
      })
      .catch(error => {
        logAuthError("openAuthSessionAsync.failed", error);
        finish(() => reject(error));
      });
  });

export const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
};
