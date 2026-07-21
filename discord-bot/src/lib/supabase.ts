import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('A variável SUPABASE_URL não foi configurada.');
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    'A variável SUPABASE_SERVICE_ROLE_KEY não foi configurada.',
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);