import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl) {
  throw new Error(
    "A variável SUPABASE_URL não foi configurada.",
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "A variável SUPABASE_SERVICE_ROLE_KEY não foi configurada.",
  );
}

let parsedSupabaseUrl: URL;

try {
  parsedSupabaseUrl = new URL(supabaseUrl);
} catch {
  throw new Error(
    "A variável SUPABASE_URL não contém uma URL válida.",
  );
}

if (
  parsedSupabaseUrl.protocol !== "https:" ||
  !parsedSupabaseUrl.hostname.endsWith(".supabase.co")
) {
  throw new Error(
    "SUPABASE_URL deve seguir o formato https://projeto.supabase.co.",
  );
}

console.log("");
console.log("==================================");
console.log("🔌 Configuração do Supabase");
console.log(`URL: ${parsedSupabaseUrl.origin}`);
console.log("Service Role: CARREGADA");
console.log("==================================");
console.log("");

export const supabase = createClient(
  parsedSupabaseUrl.origin,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);