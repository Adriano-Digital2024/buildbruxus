import { useEffect, useRef, useState } from "react";
import { useTyping } from "../hooks/useTyping";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

export default function MessageInput({ roomId }: { roomId: string }) {
  const { user, profile } = useAuth();
  const { setTyping, typingUsers } = useTyping(roomId, user?.id ?? null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ajusta altura do textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }, [text]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await supabase.from("messages").insert({
        room_id: roomId,
        user_id: user?.id,
        content: value,
      });
      // Entrar na sala automaticamente
      await supabase.from("room_members").upsert(
        { room_id: roomId, user_id: user!.id, last_seen_at: new Date().toISOString() },
        { onConflict: "room_id,user_id" },
      );
      setText("");
      await setTyping(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-slate-800 p-3">
      {typingUsers.length > 0 && (
        <div className="text-xs text-slate-400 mb-1 h-4">
          {typingUsers.map((t) => t.username).join(", ")}{" "}
          {typingUsers.length === 1 ? "está digitando" : "estão digitando"}...
        </div>
      )}
      <form onSubmit={send} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value && profile) setTyping(true);
          }}
          onBlur={() => setTyping(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          placeholder="Escreva uma mensagem... (Enter envia, Shift+Enter quebra linha)"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-500 resize-none"
        />
        <button
          disabled={busy || !text.trim()}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-xl transition"
        >Enviar</button>
      </form>
    </div>
  );
}