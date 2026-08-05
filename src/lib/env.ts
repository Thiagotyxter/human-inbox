function required(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export const env = {
  TYXTER_API_KEY: process.env.TYXTER_API_KEY,
  TYXTER_API_BASE_URL: process.env.TYXTER_API_BASE_URL ?? "https://api.tyxter.com",
  TYXTER_WEBHOOK_SIGNING_SECRET: process.env.TYXTER_WEBHOOK_SIGNING_SECRET,
  TYXTER_PHONE_NUMBER_ID: process.env.TYXTER_PHONE_NUMBER_ID,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  AGENT_CONTROL_SHARED_SECRET: process.env.AGENT_CONTROL_SHARED_SECRET,
  NODE_ENV: process.env.NODE_ENV ?? "development",
};

export function requireTyxterApiKey() {
  return required("TYXTER_API_KEY", env.TYXTER_API_KEY);
}

export function requireSupabaseServiceRoleKey() {
  return required("SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY);
}

export function requireSupabasePublicEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function requireAgentControlSharedSecret() {
  return required("AGENT_CONTROL_SHARED_SECRET", env.AGENT_CONTROL_SHARED_SECRET);
}
