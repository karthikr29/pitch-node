"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type UserPlan = {
  type: "free" | "pro";
  creditsRemaining: number | null;
  creditsLimit: number | null;
  creditsScope: "lifetime" | "monthly";
  periodEnd: string | null;
};

export type UserProfile = {
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  age: number | null;
  gender: string | null;
  phone: string | null;
  company: string | null;
  jobTitle: string | null;
  country: string | null;
  timezone: string | null;
  planType: "free" | "pro";
  subscriptionStatus: string;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userPlan: UserPlan | null;
  userProfile: UserProfile | null;
  planError: string | null;
  refreshPlan: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userPlan: null,
  userProfile: null,
  planError: null,
  refreshPlan: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const fetchPlan = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserPlan(null);
      setPlanError(null);
      return;
    }
    try {
      const res = await fetch("/api/user/subscription");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setPlanError(data?.error ?? "Failed to load credits");
        return;
      }
      const data = await res.json();
      setUserPlan({
        type: data.plan_type as "free" | "pro",
        creditsRemaining: data.credits_remaining,
        creditsLimit: data.credits_limit,
        creditsScope: data.credits_scope as "lifetime" | "monthly",
        periodEnd: data.period_end,
      });
      setPlanError(null);
    } catch {
      setPlanError("Failed to load credits");
    }
  }, []);

  const fetchProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserProfile(null);
      return;
    }
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) return;
      const data = await res.json();
      setUserProfile({
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        age: data.age,
        gender: data.gender,
        phone: data.phone,
        company: data.company,
        jobTitle: data.job_title,
        country: data.country,
        timezone: data.timezone,
        planType: data.plan_type as "free" | "pro",
        subscriptionStatus: data.subscription_status,
      });
    } catch {
      // Profile metadata falls back to the Supabase auth user in consumers.
    }
  }, []);

  const refreshPlan = useCallback(async () => {
    await fetchPlan(user);
  }, [fetchPlan, user]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile(user);
  }, [fetchProfile, user]);

  const applyUser = useCallback((currentUser: User | null) => {
    setUser(currentUser);
    void fetchProfile(currentUser);
    void fetchPlan(currentUser);
  }, [fetchPlan, fetchProfile]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) return;
      applyUser(data.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, applyUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userPlan,
        userProfile,
        planError,
        refreshPlan,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
