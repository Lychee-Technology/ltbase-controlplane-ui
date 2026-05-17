import { createClient } from '@supabase/supabase-js';
import type { SupabaseAuthProviderConfig } from '../types';
import type { ExternalAuthProvider } from './providers';

export function createSupabaseAuthProvider(
  config: SupabaseAuthProviderConfig,
  redirectUri?: string,
): ExternalAuthProvider {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return {
    async signIn(options?: { allowRedirect?: boolean }) {
      const { data: sessionData } = await client.auth.getSession();
      if (sessionData.session?.access_token) {
        return {
          type: 'token',
          externalToken: sessionData.session.access_token,
          subjectLabel: sessionData.session.user.email ?? sessionData.session.user.id,
        };
      }

      if (options?.allowRedirect === false) {
        return { type: 'unavailable' };
      }

      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: redirectUri ? { redirectTo: redirectUri } : undefined,
      });
      if (error) {
        throw error;
      }

      return { type: 'redirect' };
    },
    async signOut() {
      const { error } = await client.auth.signOut();
      if (error) {
        throw error;
      }
    },
  };
}
