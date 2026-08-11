import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface PresenceUser {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export function usePresence(roomId: string | null, currentUser: { id: string; username: string; avatar_url: string | null } | null) {
  const [online, setOnline] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!roomId || !currentUser) {
      setOnline([]);
      return;
    }
    const channelName = `presence:${roomId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: currentUser.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        Object.entries(state).forEach(([key, presences]) => {
          (presences as any[]).forEach((p) => {
            users.push({ user_id: key, username: p.username, avatar_url: p.avatar_url });
          });
        });
        setOnline(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            username: currentUser.username,
            avatar_url: currentUser.avatar_url,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, currentUser]);

  return online;
}