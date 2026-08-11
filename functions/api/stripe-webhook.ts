// Webhook do Stripe — recebe eventos e atualiza Supabase (subscriptions + profiles.plan).
// Configure no Stripe Dashboard → Developers → Webhooks:
//   URL: https://SEU-DOMINIO.pages.dev/api/stripe-webhook
//   Eventos: checkout.session.completed, customer.subscription.created,
//            customer.subscription.updated, customer.subscription.deleted
//
// Env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import Stripe from "stripe";

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export const onRequestPost: any = async (context: { request: Request; env: Env }) => {
  const { request, env } = context;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" as any });

  const sig = request.headers.get("Stripe-Signature") ?? "";
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.warn("[webhook] signature verification failed:", err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id ?? session.metadata?.user_id;
        const planId = session.metadata?.plan_id ?? null;
        const tier = session.metadata?.tier ?? "pro";
        if (userId) {
          await upsertSubscription(env, {
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            stripe_price_id: null,
            plan_id: planId,
            status: "active",
            current_period_end: null,
            cancel_at_period_end: false,
          });
          await setProfilePlan(env, userId, tier);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? null;
        const planId = sub.metadata?.plan_id ?? null;
        const tier = sub.metadata?.tier ?? "pro";
        if (userId) {
          await upsertSubscription(env, {
            user_id: userId,
            stripe_customer_id: sub.customer as string,
            stripe_subscription_id: sub.id,
            stripe_price_id: (sub.items.data[0]?.price?.id) ?? null,
            plan_id: planId,
            status: sub.status,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: sub.cancel_at_period_end,
          });
          if (sub.status === "active" || sub.status === "trialing") {
            await setProfilePlan(env, userId, tier);
          } else if (sub.status === "canceled" || sub.status === "unpaid") {
            await setProfilePlan(env, userId, "free");
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id ?? null;
        if (userId) {
          await updateSubscription(env, sub.id, { status: "canceled" });
          await setProfilePlan(env, userId, "free");
        }
        break;
      }
      default:
        // evento ignorado
        break;
    }
  } catch (err: any) {
    console.error("[webhook] handler error:", err.message);
    return new Response(`Internal: ${err.message}`, { status: 500 });
  }

  return json({ received: true });
};

async function upsertSubscription(env: Env, data: any) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/subscriptions`, {
    method: "POST",
    headers: supabaseHeaders(env, { "Prefer": "return=representation,resolution=merge-duplicates", "Content-Type": "application/json" }),
    body: JSON.stringify({
      user_id: data.user_id,
      stripe_customer_id: data.stripe_customer_id,
      stripe_subscription_id: data.stripe_subscription_id,
      stripe_price_id: data.stripe_price_id,
      plan_id: data.plan_id,
      status: data.status,
      current_period_end: data.current_period_end,
      cancel_at_period_end: data.cancel_at_period_end,
    }),
  });
  if (!res.ok) {
    console.warn("[upsert] non-ok", await res.text());
  }
}

async function updateSubscription(env: Env, stripeSubId: string, patch: any) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/subscriptions?stripe_subscription_id=eq.${encodeURIComponent(stripeSubId)}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(env, { "Content-Type": "application/json", "Prefer": "return=minimal" }),
      body: JSON.stringify(patch),
    },
  );
  if (!res.ok) console.warn("[update] non-ok", await res.text());
}

async function setProfilePlan(env: Env, userId: string, plan: string) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: supabaseHeaders(env, { "Content-Type": "application/json", "Prefer": "return=minimal" }),
      body: JSON.stringify({ plan }),
    },
  );
  if (!res.ok) console.warn("[setProfilePlan] non-ok", await res.text());
}

function supabaseHeaders(env: Env, extra: Record<string, string> = {}) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}