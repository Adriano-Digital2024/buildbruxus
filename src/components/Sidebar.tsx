import { useAuth } from "../context/AuthContext";
import { useSubscription, type Tier } from "../context/SubscriptionContext";
import { Link, useNavigate } from "react-router-dom";

const TIER_STYLES: Record<Tier, string> = {
  free: "bg-slate-700 text-slate-200",
  pro: "bg-brand-600 text-white",
  team: "bg-amber-500 text-slate-900",
};

export default function Sidebar({ onNewRoom }: { onNewRoom: () => void }) {
  const { profile, signOut } = useAuth();
  const { tier } = useSubscription();
  const navigate = useNavigate();

  return (
    <aside className="w-full sm:w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2">
        <span className="text-2xl">🧙</span>
        <div className="flex-1">
          <div className="font-semibold text-white leading-tight">BuildBruxus</div>
          <div className="text-xs text-slate-500">chat SaaS</div>
        </div>
      </div>

      <div className="px-4 py-3 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-full bg-brand-700 flex items-center justify-center text-white font-semibold uppercase">
          {profile?.username?.[0] ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-white truncate">{profile?.username}</div>
          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${TIER_STYLES[tier]}`}>
            {tier.toUpperCase()}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        <Link to="/" className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-200">💬 Salas</Link>
        <Link to="/account" className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-200">👤 Conta</Link>
        <Link to="/pricing" className="block px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-200">⭐ Planos</Link>
        <button
          onClick={onNewRoom}
          className="w-full text-left block px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-200"
        >➕ Nova sala</button>
      </nav>

      <div className="p-2 border-t border-slate-800">
        <button
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
          className="w-full text-left block px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-red-400"
        >↪ Sair</button>
      </div>
    </aside>
  );
}