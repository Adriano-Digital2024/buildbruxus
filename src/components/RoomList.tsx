import { useRooms, type Room } from "../hooks/useRooms";

export default function RoomList({
  activeSlug,
  onSelect,
}: {
  activeSlug: string | null;
  onSelect: (room: Room) => void;
}) {
  const { rooms, loading } = useRooms();

  if (loading) return <p className="text-sm text-slate-500 p-3">Carregando salas...</p>;

  return (
    <div className="flex flex-col gap-1 py-2">
      {rooms.length === 0 && <p className="text-sm text-slate-500 px-3">Nenhuma sala ainda.</p>}
      {rooms.map((r) => (
        <button
          key={r.id}
          onClick={() => onSelect(r)}
          className={`text-left px-3 py-2 rounded-lg text-sm transition ${
            activeSlug === r.slug
              ? "bg-brand-600 text-white"
              : "hover:bg-slate-800 text-slate-200"
          }`}
        >
          <div className="font-medium"># {r.name}</div>
          {r.description && (
            <div className="text-xs text-slate-400 truncate">{r.description}</div>
          )}
        </button>
      ))}
    </div>
  );
}