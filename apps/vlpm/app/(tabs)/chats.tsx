import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";

import { listConversations, type ConversationItem } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function ChatsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    try {
      setItems(await listConversations(session.user.id));
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
          <Text style={styles.empty}>대화가 없습니다.</Text>
        )
      }
      renderItem={({ item }) => {
        const mine = session?.user.id;
        const other =
          item.customer_id === mine
            ? item.partner?.display_name
            : item.customer?.display_name;
        return (
          <Pressable style={styles.card} onPress={() => router.push(`/chat/${item.id}`)}>
            <Text style={styles.title}>{item.requests?.product ?? "요청"}</Text>
            <Text style={styles.meta}>{other || "상대"} · {item.requests?.brand}</Text>
          </Pressable>
        );
      }}
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
  title: { fontSize: 17, fontWeight: "700", color: colors.text },
  meta: { color: colors.muted },
  empty: { textAlign: "center", color: colors.muted, marginTop: 40 },
});
