import type { ChatMessage } from "../hooks/useMessages";
import { useAuth } from "../context/AuthContext";

export default function MessageItem({
  message,
  onDelete,
}: {
  message: ChatMessage;
  onDelete: (id: string) => void;
}) {
  const { user } = useAuth();
  const mine = user?.id === message.user_id;
  const time = new Date(message.created_at).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`group flex gap-2 msg-in ${mine ? "flex-row-reverse" : ""}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold uppercase flex-shrink-0 ${
        mine ? "bg-brand-600 text-white" : "bg-slate-700 text-slate-200"
      }`}>
        {message.username?.[0] ?? "?"}
      </div>
      <div className={`max-w-[80%] ${mine ? "items-end" : ""} flex flex-col`}>
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
          <span className="font-medium text-slate-300">{mine ? "Você" : message.username}</span>
          <span>{time}</span>
        </div>
        <div className={`px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
          mine ? "bg-brand-600 text-white rounded-br-sm" : "bg-slate-800 text-slate-100 rounded-bl-sm"
        }`}>
          {message.content}
        </div>
        {mine && (
          <button
            onClick={() => onDelete(message.id)}
            className="text-[10px] text-red-400 opacity-0 group-hover:opacity-100 transition"
          >excluir</button>
        )}
      </div>
    </div>
  );
}