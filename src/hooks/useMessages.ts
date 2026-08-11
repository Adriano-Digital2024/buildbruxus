import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
}

export function useMessages(roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const channelIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      return;
    }
    setLoading(true);

    // Histórico inicial com join de profiles para username
    async function loadHistory() {
      const { data, error } = await supabase
        .from("messages")
        .select(
          "id, room_id, user_id, content, created_at, profiles:profiles!messages_user_id_fkey(username)",
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        console.warn("[useMessages] history", error.message);
      }
      const flat = (data ?? []).map((m: any) => ({
        id: m.id,
        room_id: m.room_id,
        user_id: m.user_id,
        content: m.content,
        created_at: m.created_at,
        username: m.profiles?.username ?? "anônimo",
      }));
      setMessages(flat);
      setLoading(false);
    }
    loadHistory();

    // Realtime: novas mensagens
    const channelId = `messages:${roomId}`;
    channelIdRef.current = channelId;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          const row = payload.new as ChatMessage;
          // busca username
          const { data: prof } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", row.user_id)
            .maybeSingle();
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, { ...row, username: prof?.username ?? "anônimo" }];
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setMessages((prev) => prev.filter((m) => m.id !== id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      channelIdRef.current = null;
    };
  }, [roomId]);

  const sendMessage = async (content: string) => {
    if (!roomId) throw new Error("Nenhuma sala selecionada");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Não autenticado");
    // Entrar na sala automaticamente na primeira msg
    await supabase.from("room_members").upsert(
      { room_id: roomId, user_id: u.user.id, last_seen_at: new Date().toISOString() },
      { onConflict: "room_id,user_id" },
    );
    const { error } = await supabase
      .from("messages")
      .insert({ room_id: roomId, user_id: u.user.id, content });
    if (error) throw error;
  };

  const deleteMessage = async (id: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) throw error;
  };

  return { messages, loading, sendMessage, deleteMessage };
}