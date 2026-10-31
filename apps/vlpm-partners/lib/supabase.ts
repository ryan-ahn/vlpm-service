import { AppState } from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as ExpoCrypto from "expo-crypto";

import { requireSupabaseEnv } from "@/lib/env";

const digestSha256 = async (
  algorithm: string | { name: string },
  data: ArrayBuffer | ArrayBufferView,
) => {
  const name = typeof algorithm === "string" ? algorithm : algorithm.name;
  if (name.toUpperCase() !== "SHA-256") {
    throw new Error(`Unsupported digest algorithm: ${name}`);
  }
  const source =
    data instanceof ArrayBuffer
      ? new Uint8Array(data)
      : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  return ExpoCrypto.digest(
    ExpoCrypto.CryptoDigestAlgorithm.SHA256,
    Uint8Array.from(source),
  );
};

if (typeof globalThis.crypto?.subtle?.digest !== "function") {
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      getRandomValues: ExpoCrypto.getRandomValues,
      subtle: { digest: digestSha256 },
    },
  });
}

const { supabaseUrl, supabaseAnonKey } = requireSupabaseEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

AppState.addEventListener("change", state => {
  if (state === "active") {
    void supabase.auth.startAutoRefresh();
    return;
  }
  void supabase.auth.stopAutoRefresh();
});
