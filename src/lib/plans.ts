export type Plan = "free" | "pro" | "team";

export const FREE_LIMITS = {
  maxRooms: 3,
  maxMessagesPerDay: 100,
} as const;

export const PRO_FEATURES = [
  "Mensagens ilimitadas",
  "Salas privadas",
  "Indicador de digitação avançado",
  "Histórico completo e busca",
  "Presença em tempo real",
] as const;

export const TEAM_FEATURES = [...PRO_FEATURES, "Salas para times", "Múltiplos membros", "Suporte prioritário"] as const;