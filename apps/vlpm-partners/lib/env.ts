import Constants from "expo-constants";

type Extra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

export const env = {
  supabaseUrl:
    extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    extra.supabaseAnonKey ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
};

export const requireSupabaseEnv = () => {
  const { supabaseUrl, supabaseAnonKey } = env;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase 환경 변수가 없습니다. apps/vlpm-partners/.env.example을 참고해 .env를 만드세요.",
    );
  }
  return { supabaseUrl, supabaseAnonKey };
};
