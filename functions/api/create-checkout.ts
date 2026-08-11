// Cria uma Stripe Checkout Session para assinar um plano.
// Recebe: { plan_id: string } no body.
// Requer: header Authorization: Bearer <supabase access_token>
// Env vars: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_APP_URL

import Stripe from "stripe";

interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PUBLIC_APP_URL: string;
}

export const onRequestPost: any = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;

  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Auth: valida o JWT do Supabase enviado pelo cliente
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const userResp = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!userResp.ok) return json({ error: "invalid_token" }, 401);
  const user = await userResp.json();
  const userId: string = user.id;
  const email: string = user.email;

  // Pega plan_id do body
  let planId: string;
  try {
    const body = await request.json();
    planId = body.plan_id;
  } catch {
    return json({ error: "invalid_body" }, 400);
  }
  if (!planId) return json({ error: "plan_id_required" }, 400);

  // Busca o plano no Supabase (service role para bypass RLS)
  const planResp = await fetch(
    `${env.SUPABASE_URL}/rest/v1/plans?id=eq.${encodeURIComponent(planId)}&select=*`,
    { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
  );
  const plans = await planResp.json();
  if (!plans || plans.length === 0) return json({ error: "plan_not_found" }, 404);
  const plan = plans[0];
  if (!plan.stripe_price_id || plan.stripe_price_id.startsWith("price_ REPLACE_ME")) {
    return json({ error: "stripe_price_not_configured", detail: "Edite supabase/schema.sql e substitua REPLACE_ME_* pelos IDs de preços do Stripe Dashboard." }, 400);
  }

  const appUrl = env.PUBLIC_APP_URL || "http://localhost:5173";

  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    client_reference_id: userId,
    subscription_data: {
      metadata: { user_id: userId, plan_id: plan.id, tier: plan.tier },
    },
    metadata: { user_id: userId, plan_id: plan.id },
    success_url: `${appUrl}/account?checkout=success`,
    cancel_url: `${appUrl}/pricing?checkout=cancel`,
  });

  return json({ url: session.url });
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    },
  });
}