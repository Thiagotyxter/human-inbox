import { createClient } from "@supabase/supabase-js";

import { requireSupabasePublicEnv, requireSupabaseServiceRoleKey } from "@/lib/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const { url } = requireSupabasePublicEnv();
  adminClient = createClient(url, requireSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
