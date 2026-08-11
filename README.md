# 🧙 BuildBruxus — Chat SaaS

SaaS completo de chat em tempo real com **Supabase** (auth + Postgres + Realtime) e **Stripe** (planos pagos), deploy direto em **Cloudflare Pages**.

Construído para você explorar, estudar e customizar. 100% funcional quando você configurar as chaves.

---

## ✨ Features

| Feature | Implementação |
|---|---|
| 🔐 **Auth** (email/senha + Google OAuth) | Supabase Auth |
| 👤 **Profiles** automáticos | Trigger `on_auth_user_created` no SQL |
| 💬 **Chat em tempo real** | Supabase Realtime (`postgres_changes`) |
| 🏠 **Salas** (públicas/privadas, criar/listar) | Tabela `rooms` + RLS |
| ⌨️ **Indicador "digitando..."** | Tabela `typing` + Realtime |
| 🟢 **Presence (quem está online)** | Supabase Realtime Presence API |
| 💳 **Planos pagos** (Free / Pro / Team) | Tabela `plans` + Stripe Checkout |
| 🔄 **Webhook Stripe** atualiza banco | Cloudflare Pages Function |
| 🚪 **Customer Portal** (gerenciar assinatura) | Stripe Billing Portal |
| 🛡️ **RLS (Row Level Security)** | Em todas as tabelas |
| 🎨 **UI moderna** | React 18 + TailwindCSS |

---

## 📁 Estrutura

```
buildbruxus-saas/
├── index.html              # SPA entry
├── package.json            # deps + scripts
├── vite.config.ts
├── tailwind.config.js
├── .env.example            # ← copie para .env
├── supabase/
│   └── schema.sql          # ★ rode isto no Supabase SQL Editor
├── functions/              # Cloudflare Pages Functions (serverless)
│   ├── _middleware.ts      # CORS
│   └── api/
│       ├── create-checkout.ts     # POST → Stripe Checkout Session
│       ├── stripe-webhook.ts      # POST → processa eventos Stripe
│       └── customer-portal.ts     # POST → Stripe Billing Portal
└── src/
    ├── main.tsx
    ├── App.tsx                  # roteador
    ├── lib/
    │   ├── supabase.ts          # cliente Supabase
    │   ├── stripe.ts            # loadStripe
    │   └── plans.ts             # constantes de planos
    ├── context/
    │   ├── AuthContext.tsx      # sessão + profile
    │   └── SubscriptionContext.tsx
    ├── hooks/
    │   ├── useRooms.ts          # lista de salas (realtime)
    │   ├── useMessages.ts       # mensagens (realtime insert/delete)
    │   ├── usePresence.ts       # quem está online
    │   └── useTyping.ts         # indicador de digitação
    ├── components/
    │   ├── AuthPage.tsx
    │   ├── Sidebar.tsx
    │   ├── RoomList.tsx
    │   ├── ChatWindow.tsx
    │   ├── MessageItem.tsx
    │   ├── MessageInput.tsx
    │   └── PlanBadge.tsx
    └── pages/
        ├── ChatPage.tsx        # tela principal
        ├── PricingPage.tsx     # upgrade + buy
        └── AccountPage.tsx     # perfil + assinatura
```

---

## 🚀 Setup completo (passo a passo)

### 1) Pré-requisitos

- Conta no **Supabase** (grátis até ~500MB / 50k MAU): https://supabase.com
- Conta no **Stripe** (teste): https://stripe.com
- Conta no **Cloudflare**: https://cloudflare.com
- Node 18+ instalado localmente (para `npm`/`bun`)

### 2) Criar projeto no Supabase

1. Dashboard Supabase → **New Project** → nome `buildbruxus`
2. Pegue URL e chaves: **Project Settings → API**
   - `Project URL` → vira `VITE_SUPABASE_URL`
   - `anon public` → vira `VITE_SUPABASE_ANON_KEY`
   - `service_role` (SECRETA!) → `SUPABASE_SERVICE_ROLE_KEY` (somente no Cloudflare)

### 3) Configurar Auth Google (opcional)

Supabase Dashboard → **Authentication → Providers → Google**:
- Ative o Google
- Cole Client ID + Client Secret do Google Cloud Console
- Redirect URL: `https://SEU-PROJETO.supabase.co/auth/v1/callback`

Se não quiser Google agora, pule — o login por email/senha já funciona.

### 4) Rodar o schema SQL (cria todas as tabelas)

Abra **SQL Editor** no Supabase → **New query** → cole todo o conteúdo de `supabase/schema.sql` → **Run**.

Isso cria: `profiles`, `rooms`, `room_members`, `messages`, `typing`, `plans`, `subscriptions` + RLS + triggers + 3 salas padrão (geral, projetos, pro-only).

### 5) Configurar Stripe

1. Dashboard Stripe → **Products → Add product**:
   - Produto "Pro" → preço **mensal R$ 29** + **anual R$ 290**
   - Produto "Time" → preço **mensal R$ 79** + **anual R$ 790**
2. Copie cada `price_xxxxx` ID
3. Volte no Supabase SQL Editor e atualize os `stripe_price_id`:
   ```sql
   update plans set stripe_price_id = 'price_SUA_PRO_MENSAL' where id = 'pro_monthly';
   update plans set stripe_price_id = 'price_SUA_PRO_ANUAL'  where id = 'pro_yearly';
   update plans set stripe_price_id = 'price_SUA_TEAM_MENSAL' where id = 'team_monthly';
   update plans set stripe_price_id = 'price_SUA_TEAM_ANUAL'  where id = 'team_yearly';
   ```
4. Pegue as chaves do Stripe em **Developers → API keys**:
   - `pk_test_xxx` → `VITE_STRIPE_PUBLISHABLE_KEY`
   - `sk_test_xxx` → `STRIPE_SECRET_KEY` (somente Cloudflare)
5. Webhook em **Developers → Webhooks → Add endpoint**:
   - URL: `https://SEU-DOMINIO.pages.dev/api/stripe-webhook` (coloque após o primeiro deploy)
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Pegue o signing secret `whsec_xxx` → `STRIPE_WEBHOOK_SECRET`

### 6) Rodar localmente

```bash
cp .env.example .env
# preencha .env com as chaves (VITE_*)

npm install        # ou: bun install
npm run dev        # http://localhost:5173
```

Para testar o webhook Stripe localmente (precisa do CLI do Stripe):
```bash
npm run stripe:listen
# este comando encaminha http://localhost:8788/api/stripe-webhook
# MAS você precisa servir as functions localmente com `wrangler pages dev dist -- ./functions`
```

### 7) Deploy no Cloudflare Pages

1. Suba este projeto para um repositório GitHub novo (não use o antigo `buildbruxus` com o MiMoCode junto).
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → selecione o repo
3. Configuração de build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. **Environment variables** (Settings → Environment variables):
   | Nome | Encrypt | Valor |
   |---|---|---|
   | `VITE_SUPABASE_URL` | ❌ | `https://xxx.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | ❌ | `eyJhb...` |
   | `VITE_STRIPE_PUBLISHABLE_KEY` | ❌ | `pk_test_xxx` |
   | `VITE_APP_URL` | ❌ | `https://SEU-DOMINIO.pages.dev` |
   | `SUPABASE_URL` | ✅ | `https://xxx.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | ✅ | `eyJhb...service_role...` |
   | `STRIPE_SECRET_KEY` | ✅ | `sk_test_xxx` |
   | `STRIPE_WEBHOOK_SECRET` | ✅ | `whsec_xxx` |
   | `PUBLIC_APP_URL` | ✅ | `https://SEU-DOMINIO.pages.dev` |
5. **Save and Deploy** → aguarde o build → visite o URL.
6. Volte no Stripe em **Webhooks** e confirme/altere a URL do webhook para `https://SEU-DOMINIO.pages.dev/api/stripe-webhook`.

Pronto! 🎉 O SaaS está no ar.

---

## 🔍 Onde está cada parte do código

- **Schema do banco + RLS + triggers**: `supabase/schema.sql`
- **Validação JWT do cliente na function**: `functions/api/create-checkout.ts` (linhas 19–28)
- **Webhook que atualiza Supabase**: `functions/api/stripe-webhook.ts`
- **Cliente Supabase no browser**: `src/lib/supabase.ts`
- **Contexto de auth**: `src/context/AuthContext.tsx`
- **Realtime (mensagens, presença, digitação)**: `src/hooks/use*.ts`
- **UI do chat**: `src/components/ChatWindow.tsx`, `MessageItem.tsx`, `MessageInput.tsx`
- **Planos + checkout**: `src/pages/PricingPage.tsx`, `functions/api/create-checkout.ts`
- **Conta + portal**: `src/pages/AccountPage.tsx`, `functions/api/customer-portal.ts`

---

## 🧪 Testando o fluxo completo

1. Abra a URL do deploy → **Criar conta** (email/senha)
2. Confirme o email (se você deixou a confirmação ativa no Supabase)
3. Você cai no chat → entre na sala "geral" → envie mensagens
4. Abra em outra janela anônima com outro usuário → conversem → você verá mensagens em tempo real, presença e "digitando..."
5. Vá em **Planos** → assine "Pro mensal" → use o cartão de teste Stripe: `4242 4242 4242 4242`, data futura qualquer, CVC qualquer
6. Volte em **Conta** → veja `PRO` ativo → "Gerenciar assinatura (Stripe)" abre o portal
7. Cancele no portal → o webhook marca `free` de volta (pode demorar ~1min)

---

## 🔐 Onde guardam-se as chaves (regra de ouro)

| Chave | Onde | Senso |
|---|---|---|
| `VITE_*` (URL, anon, pk) | `.env` + Cloudflare Pages (não-criptografada) | Pública (vai pro navegador) |
| `SUPABASE_SERVICE_ROLE_KEY` | Cloudflare Pages **Encrypt** + **somente functions/** | SECRETA — bypassa RLS |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Cloudflare Pages **Encrypt** | SECRETA |

**NUNCA** coloque service-role ou Stripe secret em variáveis `VITE_*` — elas viram bundle público.

---

## 🛠 Limites do plano Free

Definidos em `src/lib/plans.ts` (`maxRooms: 3`, `maxMessagesPerDay: 100`). Para aplicar de verdade:
- (a) incrementar `messages_count_today` no `profiles` via trigger, ou
- (b) checar via RLS ou na function, ou
- (c) manter simples no client + reforço com RLS.

O código atualmente usa o gating mais visual (sala `pro-only` bloqueada para free em `ChatPage.tsx`). Para hardening completo, migre para checagem server-side em `create-db-policy`.

---

## 📝 Personalizando

- **Cores** → `tailwind.config.js` (paleta `brand`)
- **Nome do app** → `src/components/Sidebar.tsx`, `src/components/AuthPage.tsx`, `index.html`
- **Preços** → atualize `supabase/schema.sql` (insert `plans`) e `src/pages/PricingPage.tsx` (`PRICING`)
- **Salas padrão** → fim do `supabase/schema.sql`

---

## 🤝 Próximos passos sugeridos

- Busca de mensagens (FTS no Postgres)
- Upload de imagens (Supabase Storage)
- Notificações push (Supabase + web-push)
- Multi-tenancy (workspaces)
- Webhooks de email (Resend) para convites
- Substituir `username` por email do Stripe customer

---

## 💬 Suporte

Este projeto foi feito para você explorar. Leia os comentários nos arquivos `functions/api/*.ts` e `src/hooks/*.ts` — lá está toda a lógica de integração. Edite, quebre, volte. Boa sorte! 🧙