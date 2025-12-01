import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase client configured for server-side rendering with Clerk authentication
 * Uses the new Clerk Supabase integration (not JWT templates)
 */
export function createServerClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_PRIMARY_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_PRIMARY_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check NEXT_PUBLIC_PRIMARY_SUPABASE_URL and NEXT_PUBLIC_PRIMARY_SUPABASE_ANON_KEY'
    );
  }

  // Create Supabase client with Clerk integration
  // This uses the new Clerk Supabase integration via accessToken() callback
  return createClient(supabaseUrl, supabaseAnonKey, {
    async accessToken() {
      // Get the Clerk session token for the current user
      // No template needed with the new integration!
      const token = await (await auth()).getToken();

      return token;
    },
  });
}

