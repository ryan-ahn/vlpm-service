import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Redirect } from "expo-router";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/lib/auth";
import { OAuthCanceledError, signInWithGoogle } from "@/lib/oauth";
import { APP_NAME, PRIVACY_URL, TERMS_URL, colors } from "@/lib/theme";

const REDIRECT_URL = makeRedirectUri({ native: "vlpm://sign-in" });

export default function SignInScreen() {
  const { session, loading } = useAuth();
  const { bottom } = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  if (!loading && session) return <Redirect href="/(tabs)" />;

  const onGoogle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle(REDIRECT_URL);
    } catch (error) {
      if (!(error instanceof OAuthCanceledError)) {
        Alert.alert(
          "로그인 실패",
          error instanceof Error ? error.message : "다시 시도해주세요.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingBottom: bottom + 16 }]}>
      <View style={styles.center}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>구글 계정으로 로그인합니다.</Text>
        <Pressable style={styles.button} onPress={onGoogle} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonText}>Google로 계속하기</Text>
          )}
        </Pressable>
      </View>
      <View style={styles.links}>
        <Pressable onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
          <Text style={styles.link}>서비스 이용약관</Text>
        </Pressable>
        <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
          <Text style={styles.link}>개인정보 처리방침</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  brand: { fontSize: 36, fontWeight: "700", color: colors.primary },
  subtitle: { fontSize: 15, color: colors.muted, textAlign: "center" },
  button: {
    marginTop: 20,
    width: "100%",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: colors.text },
  links: { flexDirection: "row", justifyContent: "center", gap: 20 },
  link: { color: colors.muted, textDecorationLine: "underline", fontSize: 13 },
});
