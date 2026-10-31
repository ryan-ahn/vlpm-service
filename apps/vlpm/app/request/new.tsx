import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { Stack, useRouter } from "expo-router";

import { createRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

export default function NewRequestScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState("");
  const [brand, setBrand] = useState("");
  const [budget, setBudget] = useState("");
  const [memo, setMemo] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!session) return;
    if (!product.trim() || !brand.trim() || !budget.trim()) {
      Alert.alert("입력 확인", "제품, 브랜드, 예산을 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      await createRequest({
        customerId: session.user.id,
        product,
        brand,
        budget,
        memo,
      });
      router.back();
    } catch (error) {
      Alert.alert("저장 실패", error instanceof Error ? error.message : "다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: "요청서 작성" }} />
      <Field label="제품" value={product} onChangeText={setProduct} placeholder="예: 에어컨" />
      <Field label="브랜드" value={brand} onChangeText={setBrand} placeholder="예: LG" />
      <Field label="예산" value={budget} onChangeText={setBudget} placeholder="예: 100만원" />
      <Field label="메모" value={memo} onChangeText={setMemo} placeholder="설치 장소, 희망 일정" multiline />
      <Pressable style={styles.button} onPress={onSubmit} disabled={busy}>
        <Text style={styles.buttonText}>{busy ? "보내는 중" : "요청서 보내기"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const Field = ({
  label,
  multiline,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.multiline]}
      placeholderTextColor={colors.muted}
      multiline={multiline}
      {...props}
    />
  </>
);

const styles = StyleSheet.create({
  screen: { padding: 20, gap: 8 },
  label: { marginTop: 8, color: colors.muted, fontWeight: "600" },
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
