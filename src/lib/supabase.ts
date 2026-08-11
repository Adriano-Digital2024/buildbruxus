import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured =
  Boolean(url && anonKey && !url.includes("SEU-PROJETO") && !anonKey.includes("sua-anon-key"));

// Cliente sempre tipado; quando não configurado usamos um placeholder que não
// vai de fato ser chamado, porque <App/> renderiza <SetupScreen/> antes.
export const supabase = createClient(
  supabaseConfigured ? url! : "https://placeholder.supabase.co",
  supabaseConfigured ? anonKey! : "placeholder-anon-key",
  {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  },
);