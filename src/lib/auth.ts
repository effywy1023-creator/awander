import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { db } from '@/lib/supabase-db';

interface AuthState {
  userId: string | null;
  displayName: string | null;
  isAdmin: boolean;
  currentProductId: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  setProduct: (productId: string) => void;
  setAuth: (userId: string, displayName: string, isAdmin: boolean) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  userId: null,
  displayName: null,
  isAdmin: false,
  currentProductId: null,
  isLoggedIn: false,
  loading: true,

  setProduct: (productId: string) => {
    set({ currentProductId: productId });
  },

  setAuth: (userId, displayName, isAdmin) => {
    set({ userId, displayName, isAdmin, isLoggedIn: true, loading: false });
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({
      userId: null,
      displayName: null,
      isAdmin: false,
      currentProductId: null,
      isLoggedIn: false,
      loading: false,
    });
  },

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await db
        .from('user_profiles')
        .select('display_name, is_admin')
        .eq('id', session.user.id)
        .maybeSingle();

      set({
        userId: session.user.id,
        displayName: profile?.display_name || session.user.email || '',
        isAdmin: profile?.is_admin ?? false,
        isLoggedIn: true,
        loading: false,
      });
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        set({
          userId: null,
          displayName: null,
          isAdmin: false,
          currentProductId: null,
          isLoggedIn: false,
        });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const { data: profile } = await db
          .from('user_profiles')
          .select('display_name, is_admin')
          .eq('id', session.user.id)
          .maybeSingle();

        set({
          userId: session.user.id,
          displayName: profile?.display_name || session.user.email || '',
          isAdmin: profile?.is_admin ?? false,
          isLoggedIn: true,
        });
      }
    });
  },
}));
