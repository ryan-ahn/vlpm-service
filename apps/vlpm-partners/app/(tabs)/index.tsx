import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listOpenRequests, type RequestItem } from "@/lib/api";
import { colors } from "@/lib/theme";

export default function RequestsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listOpenRequests());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
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
          <Text style={styles.empty}>열린 요청서가 없습니다.</Text>
        )
      }
      renderItem={({ item }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/request/${item.id}`)}>
          <Text style={styles.title}>{item.product}</Text>
          <Text style={styles.meta}>
            {item.brand} · {item.budget}
          </Text>
          <Text style={styles.name}>{item.profiles?.display_name || "고객"}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 12 },
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
  name: { marginTop: 6, color: colors.primary, fontWeight: "600" },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
