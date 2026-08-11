import { Logo } from "./Logo";

export default function SetupScreen() {
  const url = import.meta.env.VITE_SUPABASE_URL || "(não definida)";
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
    ? import.meta.env.VITE_SUPABASE_ANON_KEY.slice(0, 10) + "…"
    : "(não definida)";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 text-slate-200">
      <div className="max-w-lg w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center">
        <Logo className="h-16 mx-auto mb-4" alt="BuildBruxus" />
        <h1 className="text-xl font-semibold text-white mb-2">Configuração pendente</h1>
        <p className="text-sm text-slate-400 mb-6">
          O app carregou, mas as variáveis de ambiente do Supabase ainda não foram configuradas
          no Cloudflare Pages. Sem elas o chat não consegue se conectar.
        </p>

        <div className="bg-slate-800/60 rounded-lg p-4 text-left text-xs space-y-2 font-mono">
          <div className="flex justify-between"><span className="text-slate-500">VITE_SUPABASE_URL</span><span className="text-amber-400 truncate ml-2">{url}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VITE_SUPABASE_ANON_KEY</span><span className="text-amber-400 truncate ml-2">{anon}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">VITE_APP_URL</span><span className="text-slate-300">{import.meta.env.VITE_APP_URL || "(não definida)"}</span></div>
        </div>

        <ol className="text-left text-sm text-slate-300 space-y-2 mt-6 list-decimal list-inside">
          <li>Cloudflare Dashboard → <span className="text-brand-400">Workers &amp; Pages → buildbruxus → Settings → Environment variables</span></li>
          <li>Adicione (Production):
            <pre className="bg-slate-800 rounded p-2 mt-1 text-xs overflow-x-auto">VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi…
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_…
VITE_APP_URL=https://SEU-DOMINIO.pages.dev</pre>
          </li>
          <li>Salve e clique em <span className="text-brand-400">Retry deployment</span>.</li>
        </ol>

        <p className="text-xs text-slate-500 mt-6">
          Após configurar, recarregue esta página. Em ~1 minuto o deploy novo importa as variáveis.
        </p>
      </div>
    </div>
  );
}