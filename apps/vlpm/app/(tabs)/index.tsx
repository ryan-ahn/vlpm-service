import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listMyRequests, type RequestItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function RequestsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setItems(await listMyRequests(session.user.id));
    } finally {
      setLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.empty}>아직 요청서가 없습니다.</Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/request/${item.id}`)}>
            <Text style={styles.title}>{item.product}</Text>
            <Text style={styles.meta}>
              {item.brand} · {item.budget}
            </Text>
            <Text style={styles.status}>{item.status === "open" ? "받는 중" : "마감"}</Text>
          </Pressable>
        )}
      />
      <Pressable style={styles.fab} onPress={() => router.push("/request/new")}>
        <Text style={styles.fabText}>요청서 작성</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 4,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text },
  meta: { color: colors.muted },
  status: { marginTop: 6, color: colors.primary, fontWeight: "600" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
  fab: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  fabText: { color: colors.primaryText, fontWeight: "700", fontSize: 16 },
});
