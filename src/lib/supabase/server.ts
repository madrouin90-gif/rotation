import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    "Variables d'environnement Supabase manquantes : définis SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans .env.local"
  );
}

// Client serveur uniquement (clé service_role) — ne jamais importer ce module depuis un composant client.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
