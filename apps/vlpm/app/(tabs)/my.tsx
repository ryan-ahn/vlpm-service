import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/lib/auth";
import { signOut } from "@/lib/oauth";
import { APP_NAME, PRIVACY_URL, TERMS_URL, colors } from "@/lib/theme";

export default function MyScreen() {
  const { session, displayName } = useAuth();
  const router = useRouter();

  const onSignOut = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.brand}>{APP_NAME}</Text>
      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.email}>{session?.user.email}</Text>
      <Pressable style={styles.row} onPress={() => WebBrowser.openBrowserAsync(TERMS_URL)}>
        <Text style={styles.rowText}>서비스 이용약관</Text>
      </Pressable>
      <Pressable style={styles.row} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
        <Text style={styles.rowText}>개인정보 처리방침</Text>
      </Pressable>
      <Pressable
        style={styles.row}
        onPress={() =>
          Alert.alert("로그아웃", "로그아웃할까요?", [
            { text: "취소", style: "cancel" },
            { text: "로그아웃", style: "destructive", onPress: onSignOut },
          ])
        }>
        <Text style={[styles.rowText, { color: colors.danger }]}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, gap: 8 },
  brand: { fontSize: 14, color: colors.primary, fontWeight: "700" },
  name: { fontSize: 28, fontWeight: "700", color: colors.text },
  email: { color: colors.muted, marginBottom: 16 },
  row: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowText: { fontSize: 16, color: colors.text },
});
