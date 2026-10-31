import { Linking } from "react-native";

import * as WebBrowser from "expo-web-browser";

import { getQueryParams } from "@/lib/query-params";
import { supabase } from "@/lib/supabase";

const TIMEOUT_MS = 120_000;
const DISMISS_GRACE_MS = 10_000;

export class OAuthCanceledError extends Error {
  name = "OAuthCanceledError";
}

WebBrowser.maybeCompleteAuthSession();

const hasCallback = (url: string) => {
  const { params, errorCode } = getQueryParams(url);
  if (params.error || errorCode) return true;
  return Boolean(params.code);
};

export const signInWithGoogle = async (redirectTo: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("로그인을 시작하지 못했습니다.");

  const callbackUrl = await waitForRedirect(data.url, redirectTo);
  const { params, errorCode } = getQueryParams(callbackUrl);
  if (params.error || errorCode) {
    throw new Error("구글 로그인에 실패했습니다.");
  }
  if (!params.code) throw new Error("로그인 코드가 없습니다.");
  const exchanged = await supabase.auth.exchangeCodeForSession(params.code);
  if (exchanged.error) throw exchanged.error;
  return exchanged.data.session;
};

const waitForRedirect = (authUrl: string, redirectUrl: string) =>
  new Promise<string>((resolve, reject) => {
    let settled = false;
    let dismissTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      subscription.remove();
      clearTimeout(timeout);
      if (dismissTimer) clearTimeout(dismissTimer);
      fn();
    };

    const tryUrl = (url?: string | null) => {
      if (!url || !url.includes("sign-in") || !hasCallback(url)) return;
      finish(() => resolve(url));
    };

    const subscription = Linking.addEventListener("url", ({ url }) => tryUrl(url));
    const timeout = setTimeout(() => {
      void WebBrowser.dismissBrowser();
      finish(() => reject(new Error("로그인 시간이 초과되었습니다.")));
    }, TIMEOUT_MS);

    void Linking.getInitialURL().then(tryUrl);
    void WebBrowser.openAuthSessionAsync(authUrl, redirectUrl)
      .then(result => {
        if (result.type === "success" && result.url) {
          finish(() => resolve(result.url));
          return;
        }
        if (result.type === "cancel") {
          finish(() => reject(new OAuthCanceledError("로그인을 취소했습니다.")));
          return;
        }
        if (result.type === "dismiss") {
          dismissTimer = setTimeout(() => {
            finish(() => reject(new OAuthCanceledError("로그인을 취소했습니다.")));
          }, DISMISS_GRACE_MS);
        }
      })
      .catch(error => finish(() => reject(error)));
  });

export const signOut = async () => {
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw error;
};
