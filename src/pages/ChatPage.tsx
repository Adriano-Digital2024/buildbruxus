import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../context/SubscriptionContext";
import Sidebar from "../components/Sidebar";
import RoomList from "../components/RoomList";
import ChatWindow from "../components/ChatWindow";
import type { Room } from "../hooks/useRooms";

const PRO_ONLY_SLUGS = ["pro-only"];

export default function ChatPage() {
  const { tier } = useSubscription();
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [showNewRoom, setShowNewRoom] = useState(false);

  // Pré-seleciona a sala "geral" ao abrir
  useEffect(() => {
    (async () => {
      if (activeRoom) return;
      const { data } = await supabase
        .from("rooms")
        .select("id, name, slug, description, is_public, created_at")
        .eq("slug", "geral")
        .maybeSingle();
      if (data) setActiveRoom(data as Room);
    })();
  }, [activeRoom]);

  function canAccessRoom(room: Room): boolean {
    if (tier !== "free") return true;
    if (PRO_ONLY_SLUGS.includes(room.slug)) return false;
    return true;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNewRoom={() => setShowNewRoom(true)} />

      <div className="flex-1 flex">
        <div className="w-full sm:w-56 border-r border-slate-800 bg-slate-900 flex-shrink-0 overflow-y-auto">
          <div className="px-3 py-2 text-xs uppercase text-slate-500 tracking-wider sticky top-0 bg-slate-900">
            Salas
          </div>
          <RoomList
            activeSlug={activeRoom?.slug ?? null}
            onSelect={(r) => {
              if (!canAccessRoom(r)) {
                alert("Esta sala é exclusiva para membros Pro. Faça upgrade!");
                return;
              }
              setActiveRoom(r);
            }}
          />
        </div>

        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {activeRoom ? (
            <ChatWindow roomId={activeRoom.id} roomName={activeRoom.name} />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <div className="text-5xl mb-3">🧙</div>
                <p className="text-sm">Selecione uma sala para começar a conversar</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showNewRoom && (
        <NewRoomModal
          onClose={() => setShowNewRoom(false)}
          onCreated={(r) => {
            setActiveRoom(r);
            setShowNewRoom(false);
          }}
        />
      )}
    </div>
  );
}

function NewRoomModal({ onClose, onCreated }: { onClose: () => void; onCreated: (r: Room) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      const { data, error } = await supabase
        .from("rooms")
        .insert({ name, slug, description, is_public: isPublic, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      onCreated(data as Room);
    } catch (e: any) {
      if (e.code === "23505") setErr("Já existe uma sala com esse nome. Tente outro.");
      else setErr(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Nova sala</h3>
        <form onSubmit={create} className="space-y-3">
          <input
            required maxLength={30}
            placeholder="Nome da sala"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
          <input
            maxLength={120}
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-500"
          />
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            Sala pública
          </label>
          {err && <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded">{err}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-sm hover:bg-slate-800 text-slate-300">Cancelar</button>
            <button disabled={busy} className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm">
              {busy ? "Criando..." : "Criar sala"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}