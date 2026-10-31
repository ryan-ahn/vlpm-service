import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  getRequest,
  listEstimates,
  sendEstimate,
  type EstimateItem,
  type RequestItem,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const router = useRouter();
  const [request, setRequest] = useState<RequestItem | null>(null);
  const [mine, setMine] = useState<EstimateItem | null>(null);
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !session) return;
    setLoading(true);
    try {
      const [nextRequest, estimates] = await Promise.all([
        getRequest(id),
        listEstimates(id),
      ]);
      setRequest(nextRequest);
      const own = estimates.find(item => item.partner_id === session.user.id) ?? null;
      setMine(own);
      if (own) {
        setPrice(own.price);
        setMessage(own.message ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [id, session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onSend = async () => {
    if (!session || !request || !price.trim()) {
      Alert.alert("입력 확인", "견적 금액을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      const conversationId = await sendEstimate({
        requestId: request.id,
        customerId: request.customer_id,
        partnerId: session.user.id,
        price,
        message,
      });
      router.replace(`/chat/${conversationId}`);
    } catch (error) {
      Alert.alert("전송 실패", error instanceof Error ? error.message : "다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !request) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "견적 보내기" }} />
      <Text style={styles.title}>{request.product}</Text>
      <Text style={styles.meta}>
        {request.brand} · 예산 {request.budget}
      </Text>
      <Text style={styles.meta}>{request.profiles?.display_name || "고객"}</Text>
      {request.memo ? <Text style={styles.memo}>{request.memo}</Text> : null}
      <Text style={styles.label}>견적 금액</Text>
      <TextInput
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        placeholder="예: 89만원"
        placeholderTextColor={colors.muted}
      />
      <Text style={styles.label}>메시지</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={message}
        onChangeText={setMessage}
        placeholder="포함 내용, 일정"
        placeholderTextColor={colors.muted}
        multiline
      />
      <Pressable style={styles.button} onPress={onSend} disabled={busy}>
        <Text style={styles.buttonText}>
          {busy ? "보내는 중" : mine ? "견적 수정 후 대화" : "견적 보내고 대화하기"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  screen: { padding: 20, gap: 8 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  meta: { color: colors.muted },
  memo: { color: colors.text, lineHeight: 22, marginTop: 8 },
  label: { marginTop: 12, color: colors.muted, fontWeight: "600" },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  button: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonText: { color: colors.primaryText, fontWeight: "700", fontSize: 16 },
});
