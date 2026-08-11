import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import { PlanBadge } from "../components/PlanBadge";
import { supabase } from "../lib/supabase";

export default function AccountPage() {
  const { profile, signOut } = useAuth();
  const { tier, subscription } = useSubscription();
  const isPaid = tier === "pro" || tier === "team";

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-white mb-6">Minha conta</h1>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-brand-700 flex items-center justify-center text-2xl font-semibold uppercase text-white">
              {profile?.username?.[0] ?? "?"}
            </div>
            <div>
              <div className="text-lg font-semibold text-white">{profile?.username}</div>
              <div className="text-sm text-slate-400">{profile?.full_name || "—"}</div>
              <div className="mt-1"><PlanBadge tier={tier} /></div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 space-y-3 text-sm">
            <Row label="ID do usuário" value={profile?.id ?? "—"} mono />
            <Row label="Plano atual" value={tier.toUpperCase()} />
            <Row label="Membro desde" value={profile ? new Date(profile.created_at).toLocaleDateString("pt-BR") : "—"} />
            {isPaid && (
              <>
                <Row label="Status da assinatura" value={subscription?.status ?? "—"} />
                {subscription?.current_period_end && (
                  <Row
                    label="Renova em"
                    value={new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                  />
                )}
                <Row label="Cancela no fim do período" value={subscription?.cancel_at_period_end ? "Sim" : "Não"} />
              </>
            )}
          </div>

          {isPaid && (
            <div className="mt-6 border-t border-slate-800 pt-4 flex flex-wrap gap-2">
              <ManagePortalButton />
              <Link to="/pricing" className="text-sm px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200">Trocar plano</Link>
            </div>
          )}
          {!isPaid && (
            <div className="mt-6 border-t border-slate-800 pt-4">
              <Link to="/pricing" className="inline-block bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-2 rounded-lg">Fazer upgrade</Link>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
          <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">← Voltar ao chat</Link>
          <button onClick={signOut} className="text-sm text-red-400 hover:text-red-300">Sair da conta</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span className={`text-slate-200 text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

function ManagePortalButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setErr(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/customer-portal", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao abrir portal");
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e.message);
      setBusy(false);
    }
  }
  return (
    <>
      <button
        onClick={open}
        disabled={busy}
        className="text-sm px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50"
      >{busy ? "Abrindo..." : "Gerenciar assinatura (Stripe)"}</button>
      {err && <p className="text-xs text-red-400">{err}</p>}
    </>
  );
}