import { Stack } from "expo-router";
import { useURL } from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AuthProvider } from "@/lib/auth";
import { describeOAuthUrl, logAuth, logAuthError } from "@/lib/auth-log";
import { handleOAuthCallbackUrl, isOAuthCallbackUrl } from "@/lib/oauth";
import { colors } from "@/lib/theme";

const OAuthDeepLinkHandler = () => {
  const url = useURL();
  useEffect(() => {
    if (!url) return;
    logAuth("deepLink.useURL", describeOAuthUrl(url));
    if (!isOAuthCallbackUrl(url)) return;
    void handleOAuthCallbackUrl(url)
      .then(session => {
        if (session) {
          logAuth("deepLink.sessionCreated", { userId: session.user.id });
        }
      })
      .catch(error => {
        logAuthError("deepLink.failed", error);
      });
  }, [url]);
  return null;
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <OAuthDeepLinkHandler />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
