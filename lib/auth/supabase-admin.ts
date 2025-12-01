import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_PRIMARY_SUPABASE_URL!,
    process.env.PRIMARY_SUPABASE_SERVICE_ROLE_KEY!
  );
}

