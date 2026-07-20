import {
  createClient,
  type SupabaseClient
} from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

function getProjectUrl() {
  const projectUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  if (!projectUrl) {
    throw new Error(
      "A URL do Supabase não foi configurada no servidor."
    );
  }

  return projectUrl;
}

function getServerSecretKey() {
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secretKey) {
    throw new Error(
      "A chave secreta do Supabase não foi configurada no servidor."
    );
  }

  return secretKey;
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error(
      "O cliente administrativo do Supabase só pode ser usado no servidor."
    );
  }

  if (!adminClient) {
    adminClient = createClient(
      getProjectUrl(),
      getServerSecretKey(),
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );
  }

  return adminClient;
}
