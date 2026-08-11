// Helpers de Stripe baseados em fetch + Web Crypto API.
// Funcionam no Cloudflare Workers/Pages Functions SEM nodejs_compat e SEM SDK.
// Docs: https://docs.stripe.com/api
//
// Pagamento/cobrança usa a REST API do Stripe (https://api.stripe.com/v1/...)
// Verificação de webhook usa HMAC-SHA256 via Web Crypto (crypto.subtle).

const STRIPE_API = "https://api.stripe.com";

export interface StripeContext {
  secretKey: string;
}

/** Faz um POST form-encoded para a API do Stripe. */
export async function stripePost<T = any>(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
  ctx: StripeContext,
): Promise<T> {
  const body = encodeForm(params);
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ctx.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json() as any;
  if (!res.ok) {
    const err = new Error(json?.error?.message ?? `Stripe API ${res.status}`) as any;
    err.status = res.status;
    err.code = json?.error?.code;
    err.stripeError = json?.error;
    throw err;
  }
  return json as T;
}

/** Codifica params aninhados no formato form-encoded do Stripe (ex.: line_items[0][price]). */
function encodeForm(params: Record<string, any>): string {
  const parts: string[] = [];
  const visit = (key: string, value: any) => {
    if (value === null || value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => visit(`${key}[${i}]`, v));
    } else if (typeof value === "object") {
      for (const k of Object.keys(value)) visit(`${key}[${k}]`, value[k]);
    } else {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    }
  };
  for (const k of Object.keys(params)) visit(k, params[k]);
  return parts.join("&");
}

export interface CheckoutSession {
  id: string;
  url: string;
}

/** Cria uma Stripe Checkout Session (subscription mode). */
export async function createCheckoutSession(
  opts: {
    priceId: string;
    customerEmail?: string;
    clientReferenceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata?: Record<string, string>;
    subscriptionMetadata?: Record<string, string>;
  },
  ctx: StripeContext,
): Promise<CheckoutSession> {
  return stripePost<CheckoutSession>(
    "/v1/checkout/sessions",
    {
      mode: "subscription",
      "line_items[0][price]": opts.priceId,
      "line_items[0][quantity]": 1,
      client_reference_id: opts.clientReferenceId,
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      customer_email: opts.customerEmail,
      metadata: opts.metadata,
      subscription_data: opts.subscriptionMetadata as any,
    },
    ctx,
  );
}

export interface PortalSession {
  id: string;
  url: string;
}

export async function createBillingPortalSession(
  opts: { customerId: string; returnUrl: string },
  ctx: StripeContext,
): Promise<PortalSession> {
  return stripePost<PortalSession>(
    "/v1/billing_portal/sessions",
    {
      customer: opts.customerId,
      return_url: opts.returnUrl,
    },
    ctx,
  );
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end: number | null;
  cancel_at_period_end: boolean;
  items: { data: { price: { id: string } | null }[] };
  metadata: Record<string, string> | null;
}

/** Recupera uma Subscription do Stripe (para refresh via webhook opcional). */
export async function retrieveSubscription(id: string, ctx: StripeContext): Promise<StripeSubscription> {
  const res = await fetch(`${STRIPE_API}/v1/subscriptions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${ctx.secretKey}` },
  });
  return res.json() as Promise<StripeSubscription>;
}

/** Verifica a assinatura do webhook Stripe usando HMAC-SHA256 (Web Crypto). */
export async function verifyWebhookSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  // Formato: t=timestamp,v1=signature
  const parts = signatureHeader.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return false;

  const signedPayload = `${t}.${payload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Comparação constant-time
  if (computed.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

/** Calcula assinatura no formato Stripe webhook (usado apenas em testes) e compara timing. */
export function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}