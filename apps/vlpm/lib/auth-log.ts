import { getQueryParams } from "@/lib/query-params";

const TAG = "[vlpm:auth]";

export const describeOAuthUrl = (url: string) => {
  const { params, errorCode } = getQueryParams(url);
  return {
    target: url.split("?")[0]?.split("#")[0] ?? url,
    paramKeys: Object.keys(params),
    hasCode: Boolean(params.code),
    hasAccessToken: Boolean(params.access_token),
    hasRefreshToken: Boolean(params.refresh_token),
    error: params.error ?? errorCode ?? null,
  };
};

export const logAuth = (step: string, detail?: Record<string, unknown>) => {
  if (!__DEV__) return;
  if (detail) {
    console.log(TAG, step, detail);
    return;
  }
  console.log(TAG, step);
};

export const logAuthError = (step: string, error: unknown) => {
  if (!__DEV__) return;
  const message = error instanceof Error ? error.message : String(error);
  const name = error instanceof Error ? error.name : "Error";
  console.warn(TAG, step, { name, message });
};
