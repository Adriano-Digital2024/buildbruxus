import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "./AuthContext";

export type Tier = "free" | "pro" | "team";

export interface Subscription {
  id: string;
  plan_id: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface SubState {
  tier: Tier;
  subscription: Subscription | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const SubContext = createContext<SubState | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(userId: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscriptions")
      .select("id, plan_id, status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.warn("[sub] load", error.message);
    setSub((data as Subscription | null) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    if (user) load(user.id);
    else {
      setSub(null);
      setLoading(false);
    }
  }, [user]);

  const tier: Tier = (profile?.plan as Tier) ?? (sub && sub.status === "active" ? "pro" : "free");

  const value = useMemo<SubState>(
    () => ({
      tier,
      subscription: sub,
      loading,
      refresh: () => (user ? load(user.id) : Promise.resolve()),
    }),
    [tier, sub, loading, user],
  );

  return <SubContext.Provider value={value}>{children}</SubContext.Provider>;
}

export function useSubscription() {
  const ctx = useContext(SubContext);
  if (!ctx) throw new Error("useSubscription deve ser usado dentro de <SubscriptionProvider>");
  return ctx;
}