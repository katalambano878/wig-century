import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { isPlainPostgres } from './db/mode';
import { createClient as createPgClient } from './db/supabase-compat';

/**
 * Server-side admin client.
 * Plain Postgres (DATABASE_URL set): in-process pg compat.
 * Otherwise: hosted Supabase service-role client.
 * Never import this from a client component.
 */

function createAdminClient() {
  if (isPlainPostgres()) {
    return createPgClient();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('[supabase-admin] missing env vars — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  try {
    return createSupabaseJsClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || 'placeholder-key', {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (e) {
    console.error('[supabase-admin] createClient failed:', e);
    return createSupabaseJsClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
}

export const supabaseAdmin: any = createAdminClient();
