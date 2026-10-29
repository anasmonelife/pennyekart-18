import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session, User } from "@supabase/supabase-js";
import { maybeAskForNotifications } from "@/lib/notificationReminder";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_id: string | null;
  is_super_admin: boolean;
  is_approved: boolean;
  mobile_number: string | null;
  date_of_birth: string | null;
  user_type: string;
  local_body_id: string | null;
  ward_number: number | null;
  customer_id: string | null;
  seller_type?: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const clearAuth = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  // Retries on slow/flaky networks (app reopen) so a saved login isn't treated as signed out.
  const fetchProfile = useCallback(async (userId: string) => {
    const delays = [0, 800, 2000, 4000];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
      if (!mountedRef.current) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        if (!error) {
          const { data: assignedRole } = await supabase.from("user_roles").select("role_id").eq("user_id", userId).maybeSingle();
          if (mountedRef.current) setProfile(data ? { ...data, role_id: assignedRole?.role_id ?? data.role_id } as unknown as Profile : null);
          return;
        }
        console.error("Failed to fetch profile:", error);
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mountedRef.current) return;
        
        if (_event === 'SIGNED_OUT' || !newSession) {
          clearAuth();
          setLoading(false);
          return;
        }

        setSession(newSession);
        setUser(newSession.user);

        // Defer Supabase calls to avoid deadlock in onAuthStateChange
        setTimeout(() => {
          if (!mountedRef.current) return;
          // Update last_login_at on sign in
          if (_event === 'SIGNED_IN') {
            supabase.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("user_id", newSession.user.id).then();
            // Ask the customer to turn on notifications (at most once a week).
            void maybeAskForNotifications();
          }
          fetchProfile(newSession.user.id).finally(() => {
            if (mountedRef.current) setLoading(false);
          });
        }, 0);
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!mountedRef.current) return;

      if (error || !initialSession) {
        clearAuth();
        setLoading(false);
        return;
      }

      setSession(initialSession);
      setUser(initialSession.user);
      // Returning signed-in customer: still offer notifications once a week.
      void maybeAskForNotifications();
      fetchProfile(initialSession.user.id).finally(() => {
        if (mountedRef.current) setLoading(false);
      });
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [clearAuth, fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // signOut may fail if session is already invalid, that's ok
    }
    clearAuth();
  }, [clearAuth]);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
