import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useSubscription, type Tier } from "../context/SubscriptionContext";

const PRICING: { tier: Tier; name: string; price: string; interval: string; tagline: string; features: string[]; highlight?: boolean }[] = [
  {
    tier: "free",
    name: "Free",
    price: "R$ 0",
    interval: "para sempre",
    tagline: "Para experimentar o BuildBruxus",
    features: ["Até 3 salas", "100 mensagens por dia", "Salas públicas", "Presence básico"],
  },
  {
    tier: "pro",
    name: "Pro",
    price: "R$ 29",
    interval: "/mês",
    tagline: "Para usuários avançados",
    highlight: true,
    features: ["Mensagens ilimitadas", "Salas privadas", "Salas Pro exclusivas", "Indicador de digitação", "Histórico completo", "Suporte por email"],
  },
  {
    tier: "team",
    name: "Time",
    price: "R$ 79",
    interval: "/mês",
    tagline: "Para equipes e businesses",
    features: ["Tudo do Pro", "Salas para times", "Múltiplos membros", "Presence avançado", "Suporte prioritário", "Onboarding dedicado"],
  },
];

export default function PricingPage() {
  const { tier } = useSubscription();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function checkout(planId: string) {
    setErr(null);
    setBusy(planId);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan_id: planId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha ao iniciar checkout");
      window.location.href = json.url;
    } catch (e: any) {
      setErr(e.message ?? String(e));
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white">Planos do BuildBruxus</h1>
          <p className="text-slate-400 mt-2">Escolha o plano certo para você. Cancele quando quiser.</p>
          <p className="text-xs text-slate-500 mt-2">Seu plano atual: <span className="text-brand-400 uppercase">{tier}</span></p>
        </div>

        {err && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded max-w-md mx-auto mb-4">{err}</p>}

        <div className="grid md:grid-cols-3 gap-5">
          {PRICING.map((p) => {
            const isCurrent = tier === p.tier;
            return (
              <div
                key={p.tier}
                className={`rounded-2xl border p-6 flex flex-col ${
                  p.highlight ? "border-brand-500 bg-brand-950/40" : "border-slate-800 bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                  {p.highlight && <span className="text-xs bg-brand-600 text-white px-2 py-0.5 rounded">Popular</span>}
                </div>
                <p className="text-slate-400 text-sm mt-1">{p.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{p.price}</span>
                  <span className="text-slate-400 text-sm">{p.interval}</span>
                </div>
                <ul className="mt-5 space-y-2 text-sm text-slate-300 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2 items-start"><span className="text-brand-400 mt-0.5">✓</span>{f}</li>
                  ))}
                </ul>
                <div className="mt-5">
                  {p.tier === "free" ? (
                    <Link
                      to="/"
                      className="w-full block text-center bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-sm"
                    >Começar grátis</Link>
                  ) : isCurrent ? (
                    <button disabled className="w-full bg-slate-800 text-slate-400 py-2 rounded-lg text-sm cursor-default">Seu plano atual</button>
                  ) : (
                    <div className="space-y-1">
                      <button
                        onClick={() => checkout(`${p.tier}_monthly`)}
                        disabled={busy === `${p.tier}_monthly`}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white py-2 rounded-lg text-sm disabled:opacity-50"
                      >{busy === `${p.tier}_monthly` ? "Abrindo checkout..." : `Assinar Mensal`}</button>
                      <button
                        onClick={() => checkout(`${p.tier}_yearly`)}
                        disabled={busy === `${p.tier}_yearly`}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded-lg text-sm disabled:opacity-50"
                      >{busy === `${p.tier}_yearly` ? "Abrindo..." : "Anual (2 meses grátis)"}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Pagamento processado pelo Stripe. Ambiente de testes até você publicar suas chaves de produção.
        </p>
        <div className="text-center mt-4">
          <Link to="/" className="text-sm text-slate-400 hover:text-slate-200">← Voltar ao chat</Link>
        </div>
      </div>
    </div>
  );
}