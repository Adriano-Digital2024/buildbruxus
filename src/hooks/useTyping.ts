import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export interface TypingUser {
  user_id: string;
  username: string;
}

export function useTyping(roomId: string | null, currentUserId: string | null) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTyping = async (isTyping: boolean) => {
    if (!roomId || !currentUserId) return;
    await supabase.from("typing").upsert(
      {
        room_id: roomId,
        user_id: currentUserId,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "room_id,user_id" },
    );
    if (isTyping) {
      // Auto limpar depois de 4s sem atividade
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setTyping(false), 4000);
    }
  };

  useEffect(() => {
    if (!roomId) {
      setTypingUsers([]);
      return;
    }
    const channel = supabase
      .channel(`typing:${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "typing", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          // Recarrega lista de quem está digitando
          const { data, error } = await supabase
            .from("typing")
            .select("user_id, is_typing, profiles:profiles!typing_user_id_fkey(username)")
            .eq("room_id", roomId)
            .eq("is_typing", true)
            .neq("user_id", currentUserId ?? "00000000-0000-0000-0000-000000000000");
          if (error) return;
          setTypingUsers(
            (data ?? []).map((r: any) => ({ user_id: r.user_id, username: r.profiles?.username ?? "alguém" })),
          );
          void payload;
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [roomId, currentUserId]);

  return { typingUsers, setTyping };
}