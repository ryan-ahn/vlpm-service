import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import {
  closeRequest,
  findConversation,
  getRequest,
  listEstimates,
  type EstimateItem,
  type RequestItem,
} from "@/lib/api";
import { colors } from "@/lib/theme";

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<RequestItem | null>(null);
  const [estimates, setEstimates] = useState<EstimateItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [nextRequest, nextEstimates] = await Promise.all([
        getRequest(id),
        listEstimates(id),
      ]);
      setRequest(nextRequest);
      setEstimates(nextEstimates);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const openChat = async (partnerId: string) => {
    if (!id) return;
    const conversationId = await findConversation(id, partnerId);
    if (!conversationId) {
      Alert.alert("대화 없음", "아직 채팅방이 없습니다.");
      return;
    }
    router.push(`/chat/${conversationId}`);
  };

  const onClose = async () => {
    if (!id) return;
    await closeRequest(id);
    await load();
  };

  if (loading || !request) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Stack.Screen options={{ title: request.product }} />
      <Text style={styles.title}>{request.product}</Text>
      <Text style={styles.meta}>
        {request.brand} · {request.budget}
      </Text>
      {request.memo ? <Text style={styles.memo}>{request.memo}</Text> : null}
      <Text style={styles.section}>받은 견적</Text>
      {estimates.length === 0 ? (
        <Text style={styles.empty}>아직 견적이 없습니다.</Text>
      ) : (
        estimates.map(item => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.cardTitle}>{item.profiles?.display_name || "파트너"}</Text>
            <Text style={styles.price}>{item.price}</Text>
            {item.message ? <Text style={styles.memo}>{item.message}</Text> : null}
            <Pressable style={styles.chat} onPress={() => openChat(item.partner_id)}>
              <Text style={styles.chatText}>대화하기</Text>
            </Pressable>
          </View>
        ))
      )}
      {request.status === "open" ? (
        <Pressable style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>요청 마감</Text>
        </Pressable>
      ) : (
        <Text style={styles.empty}>마감된 요청입니다.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  screen: { padding: 20, gap: 8 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text },
  meta: { color: colors.muted },
  memo: { color: colors.text, lineHeight: 22 },
  section: { marginTop: 16, fontSize: 16, fontWeight: "700", color: colors.text },
  empty: { color: colors.muted },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 6,
  },
  cardTitle: { fontWeight: "700", color: colors.text },
  price: { fontSize: 18, color: colors.primary, fontWeight: "700" },
  chat: {
    marginTop: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chatText: { color: colors.primaryText, fontWeight: "700" },
  close: { marginTop: 12, alignItems: "center", padding: 12 },
  closeText: { color: colors.danger, fontWeight: "700" },
});
