/** OAuth redirect URL query/hash 파싱 (expo-auth-session QueryParams와 동일) */
export const getQueryParams = (input: string) => {
  const url = new URL(input, "https://phony.example");
  const errorCode = url.searchParams.get("errorCode");
  url.searchParams.delete("errorCode");
  const params = Object.fromEntries(url.searchParams);
  if (url.hash) {
    new URLSearchParams(url.hash.replace(/^#/, "")).forEach((value, key) => {
      params[key] = value;
    });
  }
  return { errorCode, params };
};
