import { useEffect, useRef } from "react";
import { useMessages } from "../hooks/useMessages";
import { usePresence } from "../hooks/usePresence";
import { useAuth } from "../context/AuthContext";
import MessageItem from "./MessageItem";
import MessageInput from "./MessageInput";

export default function ChatWindow({ roomId, roomName }: { roomId: string; roomName: string }) {
  const { messages, loading, deleteMessage } = useMessages(roomId);
  const { profile } = useAuth();
  const online = usePresence(roomId, profile ? {
    id: profile.id,
    username: profile.username,
    avatar_url: profile.avatar_url,
  } : null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full flex-1">
      <header className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
        <div>
          <h2 className="font-semibold text-white">#{roomName}</h2>
          <p className="text-xs text-slate-400">{online.length} online agora</p>
        </div>
        <div className="flex -space-x-2">
          {online.slice(0, 6).map((u) => (
            <div
              key={u.user_id}
              title={u.username}
              className="w-7 h-7 rounded-full bg-brand-700 border-2 border-slate-900 flex items-center justify-center text-xs uppercase text-white"
            >{u.username[0]}</div>
          ))}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <p className="text-sm text-slate-500">Carregando mensagens...</p>
        ) : messages.length === 0 ? (
          <div className="text-center text-slate-500 mt-10">
            <div className="text-4xl mb-2">💬</div>
            <p className="text-sm">Seja o primeiro a enviar uma mensagem aqui!</p>
          </div>
        ) : (
          messages.map((m) => (
            <MessageItem key={m.id} message={m} onDelete={deleteMessage} />
          ))
        )}
      </div>

      <MessageInput roomId={roomId} />
    </div>
  );
}