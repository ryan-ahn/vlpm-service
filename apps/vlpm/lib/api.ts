import { supabase } from "@/lib/supabase";

export type RequestItem = {
  id: string;
  customer_id: string;
  product: string;
  brand: string;
  budget: string;
  memo: string | null;
  status: "open" | "closed";
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

export type EstimateItem = {
  id: string;
  request_id: string;
  partner_id: string;
  price: string;
  message: string | null;
  created_at: string;
  profiles?: { display_name: string | null } | null;
};

export type ConversationItem = {
  id: string;
  request_id: string;
  customer_id: string;
  partner_id: string;
  created_at: string;
  requests?: { product: string; brand: string } | null;
  customer?: { display_name: string | null } | null;
  partner?: { display_name: string | null } | null;
};

export type MessageItem = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export const listMyRequests = async (userId: string) => {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RequestItem[];
};

export const listOpenRequests = async () => {
  const { data, error } = await supabase
    .from("requests")
    .select("*, profiles!requests_customer_id_fkey(display_name)")
    .eq("status", "open")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RequestItem[];
};

export const getRequest = async (id: string) => {
  const { data, error } = await supabase
    .from("requests")
    .select("*, profiles!requests_customer_id_fkey(display_name)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as RequestItem;
};

export const createRequest = async (input: {
  customerId: string;
  product: string;
  brand: string;
  budget: string;
  memo: string;
}) => {
  const { error } = await supabase.from("requests").insert({
    customer_id: input.customerId,
    product: input.product.trim(),
    brand: input.brand.trim(),
    budget: input.budget.trim(),
    memo: input.memo.trim() || null,
  });
  if (error) throw error;
};

export const closeRequest = async (id: string) => {
  const { error } = await supabase
    .from("requests")
    .update({ status: "closed" })
    .eq("id", id);
  if (error) throw error;
};

export const listEstimates = async (requestId: string) => {
  const { data, error } = await supabase
    .from("estimates")
    .select("*, profiles!estimates_partner_id_fkey(display_name)")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EstimateItem[];
};

export const sendEstimate = async (input: {
  requestId: string;
  customerId: string;
  partnerId: string;
  price: string;
  message: string;
}) => {
  const { error: estimateError } = await supabase.from("estimates").upsert(
    {
      request_id: input.requestId,
      partner_id: input.partnerId,
      price: input.price.trim(),
      message: input.message.trim() || null,
    },
    { onConflict: "request_id,partner_id" },
  );
  if (estimateError) throw estimateError;

  const { data: existing, error: findError } = await supabase
    .from("conversations")
    .select("id")
    .eq("request_id", input.requestId)
    .eq("partner_id", input.partnerId)
    .maybeSingle();
  if (findError) throw findError;
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      request_id: input.requestId,
      customer_id: input.customerId,
      partner_id: input.partnerId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
};

export const findConversation = async (requestId: string, partnerId: string) => {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("request_id", requestId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
};

export const listConversations = async (userId: string) => {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id, request_id, customer_id, partner_id, created_at, requests(product, brand), customer:profiles!conversations_customer_id_fkey(display_name), partner:profiles!conversations_partner_id_fkey(display_name)",
    )
    .or(`customer_id.eq.${userId},partner_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ConversationItem[];
};

export const listMessages = async (conversationId: string) => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageItem[];
};

export const sendMessage = async (input: {
  conversationId: string;
  senderId: string;
  body: string;
}) => {
  const { error } = await supabase.from("messages").insert({
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    body: input.body.trim(),
  });
  if (error) throw error;
};
