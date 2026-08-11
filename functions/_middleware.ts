// Middleware CORS simples — permite que o app chame as functions/api em qualquer origem.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

export const onRequestOptions: any = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequest: any = async (context: { request: Request }) => {
  const response = await context.next();
  const headers = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
  return new Response(response.body, { status: response.status, headers });
};