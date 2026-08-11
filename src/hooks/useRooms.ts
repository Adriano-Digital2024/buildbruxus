import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";

export interface Room {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, slug, description, is_public, created_at")
      .order("created_at", { ascending: true });
    if (error) console.warn("[useRooms]", error.message);
    setRooms((data as Room[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("rooms-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const createRoom = useCallback(async (name: string, description: string, isPublic: boolean) => {
    const { data: user } = await supabase.auth.getUser();
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const { data, error } = await supabase
      .from("rooms")
      .insert({ name, slug, description, is_public: isPublic, created_by: user.user?.id })
      .select()
      .single();
    if (error) throw error;
    return data as Room;
  }, []);

  return { rooms, loading, createRoom, refresh: load };
}