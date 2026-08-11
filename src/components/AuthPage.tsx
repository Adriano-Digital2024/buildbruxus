import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AuthPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signin") await signInWithEmail(email, password);
      else await signUpWithEmail(email, password, username || email.split("@")[0]);
    } catch (e: any) {
      setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-brand-950 via-slate-950 to-brand-900">
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur rounded-2xl border border-slate-800 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🧙</div>
          <h1 className="text-2xl font-bold text-white">BuildBruxus</h1>
          <p className="text-slate-400 text-sm mt-1">
            {mode === "signin" ? "Entre para acessar o chat" : "Crie sua conta grátis"}
          </p>
        </div>

        <button
          onClick={() => signInWithGoogle().catch((e) => setErr(e.message))}
          className="w-full flex items-center justify-center gap-3 bg-white text-slate-800 font-medium py-2.5 rounded-lg hover:bg-slate-100 transition mb-4"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.49h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.63z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.32A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.97 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.3-1.7V4.98H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.02l3.01-2.32z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.98l3.01 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          Continuar com Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-slate-700 flex-1" />
          <span className="text-xs text-slate-500">ou</span>
          <div className="h-px bg-slate-700 flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <input
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          )}
          <input
            type="email"
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            required
            minLength={6}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
            placeholder="senha (mín 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {err && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">{err}</p>}
          <button
            disabled={busy}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
          >
            {busy ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="text-sm text-slate-400 text-center mt-4">
          {mode === "signin" ? "Não tem conta? " : "Já tem conta? "}
          <button
            className="text-brand-400 hover:text-brand-300"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setErr(null);
            }}
          >
            {mode === "signin" ? "Criar agora" : "Entrar"}
          </button>
        </p>
      </div>
    </div>
  );
}