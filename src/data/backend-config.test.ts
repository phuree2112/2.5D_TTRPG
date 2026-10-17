import { describe, expect, it } from 'vitest';
import { resolveBackend } from './backend-config';

describe('resolveBackend', () => {
  it('uses Local Demo mode when no Supabase settings are present', () => {
    expect(resolveBackend({})).toEqual({ mode: 'local' });
  });

  it('uses Supabase when a URL and a publishable key are set', () => {
    expect(
      resolveBackend({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
      }),
    ).toEqual({ mode: 'supabase', url: 'https://abc.supabase.co', key: 'sb_publishable_123' });
  });

  it('falls back to the legacy anon key when no publishable key is set', () => {
    expect(
      resolveBackend({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'legacy-anon-jwt',
      }),
    ).toEqual({ mode: 'supabase', url: 'https://abc.supabase.co', key: 'legacy-anon-jwt' });
  });

  it('prefers the publishable key over the legacy anon key', () => {
    expect(
      resolveBackend({
        VITE_SUPABASE_URL: 'https://abc.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
        VITE_SUPABASE_ANON_KEY: 'legacy-anon-jwt',
      }),
    ).toMatchObject({ key: 'sb_publishable_123' });
  });

  it('treats blank values as missing', () => {
    expect(
      resolveBackend({
        VITE_SUPABASE_URL: '  ',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
      }),
    ).toEqual({ mode: 'local' });
  });
});
