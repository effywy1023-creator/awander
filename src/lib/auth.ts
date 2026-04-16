import { create } from 'zustand';

interface AuthState {
  userId: string | null;
  username: string | null;
  displayName: string | null;
  isAdmin: boolean;
  currentProductId: string | null;
  isLoggedIn: boolean;
  loading: boolean;
  setProduct: (productId: string) => void;
  setAuth: (userId: string, username: string, displayName: string, isAdmin: boolean) => void;
  logout: () => void;
  initialize: () => void;
}

const SESSION_KEY = 'auth_session';

export const useAuth = create<AuthState>((set) => ({
  userId: null,
  username: null,
  displayName: null,
  isAdmin: false,
  currentProductId: null,
  isLoggedIn: false,
  loading: true,

  setProduct: (productId: string) => {
    set({ currentProductId: productId });
  },

  setAuth: (userId, username, displayName, isAdmin) => {
    const session = { userId, username, displayName, isAdmin };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    set({ userId, username, displayName, isAdmin, isLoggedIn: true, loading: false });
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({
      userId: null,
      username: null,
      displayName: null,
      isAdmin: false,
      currentProductId: null,
      isLoggedIn: false,
      loading: false,
    });
  },

  initialize: () => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const session = JSON.parse(raw);
        set({
          userId: session.userId,
          username: session.username,
          displayName: session.displayName,
          isAdmin: session.isAdmin ?? false,
          isLoggedIn: true,
          loading: false,
        });
      } catch {
        localStorage.removeItem(SESSION_KEY);
        set({ loading: false });
      }
    } else {
      set({ loading: false });
    }
  },
}));
