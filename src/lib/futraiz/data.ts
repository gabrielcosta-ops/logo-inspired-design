import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeStats, matchScore, type PlayerStats } from "./stats";
import type { FutraizData, LevelChange, MatchEvent } from "./types";

async function must<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

export const futraizQuery = queryOptions({
  queryKey: ["futraiz"],
  queryFn: async (): Promise<FutraizData> => {
    const [players, levels, settings, seasons, matches, matchPlayers, events, levelChanges] = await Promise.all([
      must(supabase.from("players").select("*").order("nickname")),
      must(supabase.from("levels").select("*").order("rank")),
      must(supabase.from("settings").select("*").eq("id", 1).maybeSingle()),
      must(supabase.from("seasons").select("*").order("started_at", { ascending: false })),
      must(supabase.from("matches").select("*").order("created_at", { ascending: false })),
      must(supabase.from("match_players").select("*")),
      must(supabase.from("match_events").select("*").order("created_at", { ascending: true })),
      must(supabase.from("level_changes").select("*").order("created_at", { ascending: false })),
    ]);
    return {
      players,
      levels,
      settings: settings ?? { id: 1, goal_points: 3, assist_points: 2, updated_at: "" },
      seasons,
      matches,
      matchPlayers,
      events,
      levelChanges,
    };
  },
  staleTime: 10_000,
});

export type Derived = ReturnType<typeof derive>;

export function derive(d: FutraizData) {
  const currentSeason = d.seasons.find((s) => s.is_current) ?? d.seasons[0] ?? null;
  const seasonMatches = d.matches.filter((m) => m.season_id === currentSeason?.id);
  const seasonMatchIds = new Set(seasonMatches.map((m) => m.id));
  const seasonEvents = d.events.filter((e) => seasonMatchIds.has(e.match_id));
  const seasonMatchPlayers = d.matchPlayers.filter((mp) => seasonMatchIds.has(mp.match_id));
  const activePlayers = d.players.filter((p) => p.active);
  const seasonStats = computeStats(activePlayers, seasonMatches, seasonMatchPlayers, seasonEvents, d.settings);
  const careerStats = computeStats(d.players, d.matches, d.matchPlayers, d.events, d.settings);
  const liveMatch = seasonMatches.find((m) => m.status === "live") ?? null;
  const liveEvents = liveMatch ? seasonEvents.filter((e) => e.match_id === liveMatch.id) : [];
  const playerById = new Map(d.players.map((p) => [p.id, p]));
  const levelByRank = new Map(d.levels.map((l) => [l.rank, l]));
  const careerById = new Map<string, PlayerStats>(careerStats.map((s) => [s.player.id, s]));
  return {
    ...d,
    currentSeason,
    seasonMatches,
    seasonEvents,
    seasonStats,
    careerStats,
    careerById,
    liveMatch,
    liveEvents,
    liveScore: matchScore(liveEvents),
    playerById,
    levelByRank,
  };
}

export function useFutraiz() {
  const q = useQuery(futraizQuery);
  const derived = useMemo(() => (q.data ? derive(q.data) : null), [q.data]);
  return { ...q, derived };
}

type LiveHandlers = {
  onGoal?: (e: MatchEvent) => void;
  onLevelUp?: (c: LevelChange) => void;
};

const TABLES = ["players", "levels", "settings", "seasons", "matches", "match_players", "match_events", "level_changes"] as const;

/** Subscribes to every FUTRAIZ table and refreshes the shared data on any change. */
export function useLiveSync(handlers: LiveHandlers = {}) {
  const queryClient = useQueryClient();
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => queryClient.invalidateQueries({ queryKey: futraizQuery.queryKey }), 150);
    };
    let channel = supabase.channel(`futraiz-${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        refresh();
        if (payload.eventType !== "INSERT") return;
        if (table === "match_events") {
          const e = payload.new as MatchEvent;
          if (e.type === "goal" || e.type === "own_goal") ref.current.onGoal?.(e);
        }
        if (table === "level_changes") {
          const c = payload.new as LevelChange;
          if (c.to_rank > c.from_rank) ref.current.onLevelUp?.(c);
        }
      });
    }
    channel.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function useNow(intervalMs = 1000, enabled = true) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
  return now;
}
