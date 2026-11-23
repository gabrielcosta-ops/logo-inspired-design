import type { Level, Match, MatchEvent, MatchPlayer, Player, Team } from "./types";

export type PlayerStats = {
  player: Player;
  goals: number;
  assists: number;
  ownGoals: number;
  yellows: number;
  reds: number;
  games: number;
  wins: number;
  points: number;
};

export type PointWeights = { goal_points: number; assist_points: number };

export function computePoints(goals: number, assists: number, w: PointWeights): number {
  return goals * w.goal_points + assists * w.assist_points;
}

export function matchScore(events: Pick<MatchEvent, "type" | "team">[]): { A: number; B: number } {
  const score = { A: 0, B: 0 };
  for (const e of events) {
    if (e.type === "goal" || e.type === "own_goal") score[e.team as Team] += 1;
  }
  return score;
}

export function matchWinner(match: Pick<Match, "winner">, events: Pick<MatchEvent, "type" | "team">[]): "A" | "B" | "draw" {
  if (match.winner === "A" || match.winner === "B" || match.winner === "draw") return match.winner;
  const s = matchScore(events);
  return s.A > s.B ? "A" : s.B > s.A ? "B" : "draw";
}

export function computeStats(
  players: Player[],
  matches: Match[],
  matchPlayers: MatchPlayer[],
  events: MatchEvent[],
  weights: PointWeights,
): PlayerStats[] {
  const matchIds = new Set(matches.map((m) => m.id));
  const byId = new Map<string, PlayerStats>();
  for (const p of players) {
    byId.set(p.id, { player: p, goals: 0, assists: 0, ownGoals: 0, yellows: 0, reds: 0, games: 0, wins: 0, points: 0 });
  }
  const eventsByMatch = new Map<string, MatchEvent[]>();
  for (const e of events) {
    if (!matchIds.has(e.match_id)) continue;
    const list = eventsByMatch.get(e.match_id) ?? [];
    list.push(e);
    eventsByMatch.set(e.match_id, list);
    const scorer = e.player_id ? byId.get(e.player_id) : undefined;
    if (e.type === "goal") {
      if (scorer) scorer.goals += 1;
      const assist = e.assist_player_id ? byId.get(e.assist_player_id) : undefined;
      if (assist) assist.assists += 1;
    } else if (e.type === "own_goal" && scorer) scorer.ownGoals += 1;
    else if (e.type === "yellow" && scorer) scorer.yellows += 1;
    else if (e.type === "red" && scorer) scorer.reds += 1;
  }
  const matchById = new Map(matches.map((m) => [m.id, m]));
  for (const mp of matchPlayers) {
    const m = matchById.get(mp.match_id);
    const s = byId.get(mp.player_id);
    if (!m || !s) continue;
    s.games += 1;
    if (m.status === "finished" && matchWinner(m, eventsByMatch.get(m.id) ?? []) === mp.team) s.wins += 1;
  }
  for (const s of byId.values()) s.points = computePoints(s.goals, s.assists, weights);
  return [...byId.values()];
}

export function rankByPoints(stats: PlayerStats[]): PlayerStats[] {
  return [...stats].sort(
    (a, b) =>
      b.points - a.points ||
      b.goals - a.goals ||
      b.assists - a.assists ||
      a.player.nickname.localeCompare(b.player.nickname, "pt-BR"),
  );
}

export function rankBy(stats: PlayerStats[], key: "goals" | "assists"): PlayerStats[] {
  return [...stats].sort(
    (a, b) => b[key] - a[key] || b.points - a.points || a.player.nickname.localeCompare(b.player.nickname, "pt-BR"),
  );
}

/** Highest level above the current one whose goal AND assist targets are both met, or null. */
export function suggestLevel(goals: number, assists: number, currentRank: number, levels: Level[]): Level | null {
  const eligible = levels
    .filter((l) => l.rank > currentRank && goals >= l.min_goals && assists >= l.min_assists)
    .sort((a, b) => b.rank - a.rank);
  return eligible[0] ?? null;
}

export function nextLevel(currentRank: number, levels: Level[]): Level | null {
  return [...levels].filter((l) => l.rank > currentRank).sort((a, b) => a.rank - b.rank)[0] ?? null;
}

export function clockSeconds(
  match: Pick<Match, "clock_started_at" | "clock_offset_seconds">,
  now: number = Date.now(),
): number {
  const running = match.clock_started_at ? Math.max(0, Math.floor((now - new Date(match.clock_started_at).getTime()) / 1000)) : 0;
  return match.clock_offset_seconds + running;
}

export function formatClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
