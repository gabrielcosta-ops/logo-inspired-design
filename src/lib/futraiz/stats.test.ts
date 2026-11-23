import { describe, expect, it } from "vitest";
import { computeStats, matchScore, rankByPoints, suggestLevel } from "./stats";
import type { Level, Match, MatchEvent, MatchPlayer, Player } from "./types";

const player = (id: string, nickname: string, level_rank = 1): Player => ({
  id, nickname, name: nickname, photo_url: null, position: "meia", shirt_number: null, level_rank, active: true, created_at: "",
});
const match = (id: string, status: "live" | "finished" = "finished"): Match => ({
  id, season_id: "s", played_at: "", team_a_name: "A", team_b_name: "B", status, clock_started_at: null,
  clock_offset_seconds: 0, winner: null, created_at: "", finished_at: null,
});
const ev = (p: Partial<MatchEvent>): MatchEvent => ({
  id: Math.random().toString(), match_id: "m1", season_id: "s", type: "goal", team: "A", player_id: null,
  assist_player_id: null, minute: 0, created_at: "", ...p,
});
const levels: Level[] = [
  { id: "1", rank: 1, name: "Pereba", min_goals: 0, min_assists: 0, created_at: "" },
  { id: "2", rank: 2, name: "Amador", min_goals: 2, min_assists: 1, created_at: "" },
  { id: "3", rank: 3, name: "Pelada Fixa", min_goals: 4, min_assists: 3, created_at: "" },
];

describe("pontuação", () => {
  it("gol vale 3 e assistência vale 2 por padrão", () => {
    const players = [player("p1", "Bolinha"), player("p2", "Zé Canela")];
    const events = [ev({ player_id: "p1", assist_player_id: "p2" }), ev({ player_id: "p1" })];
    const stats = computeStats(players, [match("m1")], [], events, { goal_points: 3, assist_points: 2 });
    expect(stats.find((s) => s.player.id === "p1")?.points).toBe(6);
    expect(stats.find((s) => s.player.id === "p2")?.points).toBe(2);
  });

  it("usa os pesos configurados pelo admin", () => {
    const stats = computeStats([player("p1", "Bolinha")], [match("m1")], [], [ev({ player_id: "p1" })], {
      goal_points: 5, assist_points: 1,
    });
    expect(stats[0]?.points).toBe(5);
  });

  it("gol contra conta pro placar do outro time mas não dá ponto", () => {
    const events = [ev({ type: "own_goal", team: "B", player_id: "p1" })];
    expect(matchScore(events)).toEqual({ A: 0, B: 1 });
    const stats = computeStats([player("p1", "Perna")], [match("m1")], [], events, { goal_points: 3, assist_points: 2 });
    expect(stats[0]?.points).toBe(0);
  });

  it("conta jogos e vitórias pela escalação", () => {
    const mps: MatchPlayer[] = [{ match_id: "m1", player_id: "p1", team: "A" }];
    const stats = computeStats([player("p1", "Bolinha")], [match("m1")], mps, [ev({ team: "A" })], {
      goal_points: 3, assist_points: 2,
    });
    expect(stats[0]?.games).toBe(1);
    expect(stats[0]?.wins).toBe(1);
  });

  it("ranking ordena por pontos", () => {
    const players = [player("p1", "Bolinha"), player("p2", "Pelé")];
    const events = [ev({ player_id: "p2" }), ev({ player_id: "p2" }), ev({ player_id: "p1" })];
    const ranked = rankByPoints(computeStats(players, [match("m1")], [], events, { goal_points: 3, assist_points: 2 }));
    expect(ranked.map((s) => s.player.nickname)).toEqual(["Pelé", "Bolinha"]);
  });
});

describe("sugestão de nível", () => {
  it("sugere subir quando bate gols E assistências do próximo nível", () => {
    expect(suggestLevel(2, 1, 1, levels)?.name).toBe("Amador");
  });
  it("não sugere quando falta assistência", () => {
    expect(suggestLevel(5, 0, 1, levels)).toBeNull();
  });
  it("sugere o nível mais alto alcançado", () => {
    expect(suggestLevel(4, 3, 1, levels)?.name).toBe("Pelada Fixa");
  });
  it("não sugere nível igual ou abaixo do atual", () => {
    expect(suggestLevel(4, 3, 3, levels)).toBeNull();
  });
});
