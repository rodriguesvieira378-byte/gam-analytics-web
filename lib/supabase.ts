import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" ||
  !projectUrl ||
  !publishableKey;

export function getSupabaseClient(): SupabaseClient {
  if (isDemoMode) {
    throw new Error(
      "Supabase não está configurado: o sistema está em modo demo."
    );
  }

  if (!client) {
    client = createClient(projectUrl!, publishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  return client;
}