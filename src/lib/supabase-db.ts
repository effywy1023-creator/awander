// Typed Supabase client wrapper for tables not yet in auto-generated types
import { supabase } from '@/integrations/supabase/client';

// Helper to bypass strict typing for tables that exist in DB but not in generated types
export const db = {
  from: (table: string) => (supabase as any).from(table),
};
