// Cria uma Stripe Billing Portal Session — permite o usuário gerenciar assinatura.
// Requer: header Authorization: Bearer <supabase access_token>
// Env vars: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_APP_URL

import { createBillingPortalSession } from "../_lib/stripe";

interface Env {
  STRIPE_SECRET_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PUBLIC_APP_URL: string;
}

export const onRequestPost: any = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });

  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "unauthorized" }, 401);

  const userResp = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!userResp.ok) return json({ error: "invalid_token" }, 401);
  const user = await userResp.json();
  const userId: string = user.id;

  // Acha o stripe_customer_id do usuário
  const subsResp = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=stripe_customer_id&order=created_at.desc&limit=1`,
    { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } },
  );
  const subs = await subsResp.json();
  const customerId = subs && subs[0]?.stripe_customer_id;
  if (!customerId) return json({ error: "no_subscription_found" }, 404);

  const appUrl = env.PUBLIC_APP_URL || "http://localhost:5173";
  const portal = await createBillingPortalSession(
    { customerId, returnUrl: `${appUrl}/account` },
    { secretKey: env.STRIPE_SECRET_KEY },
  );

  return json({ url: portal.url });
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