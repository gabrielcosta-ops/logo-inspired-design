import type { Tables } from "@/integrations/supabase/types";

export type Player = Tables<"players">;
export type Level = Tables<"levels">;
export type Settings = Tables<"settings">;
export type Season = Tables<"seasons">;
export type Match = Tables<"matches">;
export type MatchPlayer = Tables<"match_players">;
export type MatchEvent = Tables<"match_events">;
export type LevelChange = Tables<"level_changes">;
export type Team = "A" | "B";

export type FutraizData = {
  players: Player[];
  levels: Level[];
  settings: Settings;
  seasons: Season[];
  matches: Match[];
  matchPlayers: MatchPlayer[];
  events: MatchEvent[];
  levelChanges: LevelChange[];
};

export const POSITION_LABEL: Record<Player["position"], string> = {
  goleiro: "Goleiro",
  zagueiro: "Zagueiro",
  meia: "Meia",
  atacante: "Atacante",
};
