export type BackendEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Legacy name; Supabase is retiring anon keys by the end of 2026 (Engineering.md D10). */
  VITE_SUPABASE_ANON_KEY?: string;
};

export type BackendConfig = { mode: 'local' } | { mode: 'supabase'; url: string; key: string };

function present(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Local Demo mode unless both a Supabase URL and a key are configured. */
export function resolveBackend(env: BackendEnv): BackendConfig {
  const url = present(env.VITE_SUPABASE_URL);
  const key = present(env.VITE_SUPABASE_PUBLISHABLE_KEY) ?? present(env.VITE_SUPABASE_ANON_KEY);
  if (url && key) return { mode: 'supabase', url, key };
  return { mode: 'local' };
}
