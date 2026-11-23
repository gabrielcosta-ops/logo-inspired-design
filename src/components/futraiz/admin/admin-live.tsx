import { Pause, Play, Undo2, Flag, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { describeEvent, EventFeed, Scoreboard } from "@/components/futraiz/live";
import { PlayerAvatar } from "@/components/futraiz/player-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Derived } from "@/lib/futraiz/data";
import { clockSeconds, matchScore } from "@/lib/futraiz/stats";
import type { Match, MatchEvent, Player, Team } from "@/lib/futraiz/types";
import { cn } from "@/lib/utils";
import { useAdminRun } from "./common";

type Flow =
  | { kind: "goal"; team: Team; step: "scorer" }
  | { kind: "goal"; team: Team; step: "assist"; scorerId: string }
  | { kind: "own_goal" }
  | { kind: "yellow" }
  | { kind: "red" };

export function AdminLive({ d }: { d: Derived }) {
  return d.liveMatch ? <LiveControl d={d} match={d.liveMatch} /> : <NewMatch d={d} />;
}

function NewMatch({ d }: { d: Derived }) {
  const run = useAdminRun();
  const [teamA, setTeamA] = useState("Amarelo");
  const [teamB, setTeamB] = useState("Verde");
  const [lineup, setLineup] = useState<Record<string, Team>>({});
  const [busy, setBusy] = useState(false);
  const players = d.players.filter((p) => p.active);

  function cycle(id: string) {
    setLineup((l) => {
      const next = { ...l };
      if (!l[id]) next[id] = "A";
      else if (l[id] === "A") next[id] = "B";
      else delete next[id];
      return next;
    });
  }

  async function start() {
    if (!d.currentSeason) { toast.error("Nenhuma temporada ativa"); return; }
    setBusy(true);
    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        season_id: d.currentSeason.id,
        team_a_name: teamA || "Time A",
        team_b_name: teamB || "Time B",
        status: "live",
        clock_started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !match) {
      setBusy(false);
      { toast.error(error?.message ?? "Erro ao criar jogo"); return; }
    }
    const rows = Object.entries(lineup).map(([player_id, team]) => ({ match_id: match.id, player_id, team }));
    await run(() => (rows.length ? supabase.from("match_players").insert(rows) : Promise.resolve({ error: null })), "Bola rolando! ⚽");
    setBusy(false);
  }

  const count = (t: Team) => Object.values(lineup).filter((v) => v === t).length;

  return (
    <div className="space-y-4">
      <div className="panel-crest rounded-2xl p-4">
        <h2 className="mb-3 font-display text-2xl text-gold">Novo racha</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-card-yellow" /> Time 1</Label>
            <Input value={teamA} onChange={(e) => setTeamA(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5"><span className="h-2 w-5 rounded bg-grass" /> Time 2</Label>
            <Input value={teamB} onChange={(e) => setTeamB(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 font-heading text-sm text-gold"><Users className="h-4 w-4" /> Escalação</h3>
          <span className="text-xs text-muted-foreground">{teamA}: {count("A")} · {teamB}: {count("B")}</span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">Toque no jogador: 1x = {teamA}, 2x = {teamB}, 3x = fora.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {players.map((p) => {
            const t = lineup[p.id];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => cycle(p.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border-2 p-2 text-left transition-colors",
                  t === "A" && "border-card-yellow bg-card-yellow/10",
                  t === "B" && "border-grass bg-grass/10",
                  !t && "border-border bg-muted/40",
                )}
              >
                <PlayerAvatar player={p} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.nickname}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="gold" size="huge" className="w-full" onClick={start} disabled={busy}>
        <Play /> Começar jogo
      </Button>
    </div>
  );
}

function LiveControl({ d, match }: { d: Derived; match: Match }) {
  const run = useAdminRun();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [showAll, setShowAll] = useState(false);
  const events = d.liveEvents;
  const lineup = useMemo(() => d.matchPlayers.filter((mp) => mp.match_id === match.id), [d.matchPlayers, match.id]);
  const teamOf = useMemo(() => new Map(lineup.map((mp) => [mp.player_id, mp.team as Team])), [lineup]);
  const running = !!match.clock_started_at;

  const minute = () => Math.max(1, Math.ceil(clockSeconds(match) / 60));

  async function ensureInLineup(playerId: string, team: Team) {
    if (teamOf.has(playerId)) return;
    await supabase.from("match_players").insert({ match_id: match.id, player_id: playerId, team });
  }

  async function addEvent(e: Pick<MatchEvent, "type" | "team" | "player_id" | "assist_player_id">) {
    setFlow(null);
    setShowAll(false);
    if (e.player_id && e.type !== "own_goal") await ensureInLineup(e.player_id, e.team as Team);
    await run(() => supabase.from("match_events").insert({ ...e, match_id: match.id, minute: minute() }));
  }

  async function toggleClock() {
    if (running) {
      await run(() =>
        supabase.from("matches").update({ clock_started_at: null, clock_offset_seconds: clockSeconds(match) }).eq("id", match.id),
      );
    } else {
      await run(() => supabase.from("matches").update({ clock_started_at: new Date().toISOString() }).eq("id", match.id));
    }
  }

  async function undo() {
    const last = events[events.length - 1];
    if (!last) { toast("Nada pra desfazer"); return; }
    const d2 = describeEvent(last, d.playerById);
    await run(() => supabase.from("match_events").delete().eq("id", last.id), `Desfeito: ${d2.text}`);
  }

  async function finish() {
    const s = matchScore(events);
    const winner = s.A > s.B ? "A" : s.B > s.A ? "B" : "draw";
    await run(
      () =>
        supabase
          .from("matches")
          .update({
            status: "finished",
            winner,
            finished_at: new Date().toISOString(),
            clock_started_at: null,
            clock_offset_seconds: clockSeconds(match),
          })
          .eq("id", match.id),
      "Jogo encerrado 🏁",
    );
  }

  function onPick(playerId: string | null) {
    if (!flow) return;
    if (flow.kind === "goal" && flow.step === "scorer" && playerId) {
      setShowAll(false);
      setFlow({ kind: "goal", team: flow.team, step: "assist", scorerId: playerId });
    } else if (flow.kind === "goal" && flow.step === "assist") {
      void addEvent({ type: "goal", team: flow.team, player_id: flow.scorerId, assist_player_id: playerId });
    } else if (flow.kind === "own_goal" && playerId) {
      const own = teamOf.get(playerId) ?? "A";
      void addEvent({ type: "own_goal", team: own === "A" ? "B" : "A", player_id: playerId, assist_player_id: null });
    } else if ((flow.kind === "yellow" || flow.kind === "red") && playerId) {
      void addEvent({ type: flow.kind, team: teamOf.get(playerId) ?? "A", player_id: playerId, assist_player_id: null });
    }
  }

  const pickerPlayers = (): Player[] => {
    const active = d.players.filter((p) => p.active);
    if (!flow) return [];
    let base: Player[];
    if (flow.kind === "goal") {
      base = active.filter((p) => teamOf.get(p.id) === flow.team);
      if (flow.step === "assist") base = base.filter((p) => p.id !== flow.scorerId);
    } else base = active.filter((p) => teamOf.has(p.id));
    if (showAll || base.length === 0) {
      const ids = new Set(base.map((p) => p.id));
      const scorer = flow.kind === "goal" && flow.step === "assist" ? flow.scorerId : null;
      return [...base, ...active.filter((p) => !ids.has(p.id) && p.id !== scorer)];
    }
    return base;
  };

  const title = !flow
    ? ""
    : flow.kind === "goal"
      ? flow.step === "scorer"
        ? `Quem fez o gol? (${flow.team === "A" ? match.team_a_name : match.team_b_name})`
        : "Quem deu a assistência?"
      : flow.kind === "own_goal"
        ? "Quem fez gol contra?"
        : flow.kind === "yellow"
          ? "Cartão amarelo pra quem?"
          : "Cartão vermelho pra quem?";

  return (
    <div className="space-y-3">
      <Scoreboard match={match} events={events} compact />

      <div className="grid grid-cols-2 gap-3">
        <Button size="huge" className="flex-col gap-0 bg-card-yellow text-primary-foreground font-display hover:brightness-110" onClick={() => setFlow({ kind: "goal", team: "A", step: "scorer" })}>
          GOL
          <span className="max-w-full truncate font-heading text-sm">{match.team_a_name}</span>
        </Button>
        <Button variant="grass" size="huge" className="flex-col gap-0 font-display" onClick={() => setFlow({ kind: "goal", team: "B", step: "scorer" })}>
          GOL
          <span className="max-w-full truncate font-heading text-sm">{match.team_b_name}</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="board" size="xl" className="text-sm" onClick={() => setFlow({ kind: "own_goal" })}>🙈 Gol contra</Button>
        <Button variant="board" size="xl" className="text-sm" onClick={() => setFlow({ kind: "yellow" })}>
          <span className="h-5 w-4 rounded-sm bg-card-yellow" /> Amarelo
        </Button>
        <Button variant="board" size="xl" className="text-sm" onClick={() => setFlow({ kind: "red" })}>
          <span className="h-5 w-4 rounded-sm bg-card-red" /> Vermelho
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="xl" onClick={undo} disabled={events.length === 0} className="text-base">
          <Undo2 /> Desfazer
        </Button>
        <Button variant="outline" size="xl" onClick={toggleClock} className="text-base">
          {running ? <Pause /> : <Play />} {running ? "Pausar" : "Rodar"}
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="xl" className="text-base"><Flag /> Encerrar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar o jogo?</AlertDialogTitle>
              <AlertDialogDescription>
                O placar fica {matchScore(events).A} × {matchScore(events).B} e o vencedor é registrado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={finish}>Encerrar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <h3 className="mb-2 font-heading text-sm text-gold">Lances</h3>
        <EventFeed events={events} players={d.playerById} match={match} />
      </div>

      <Drawer open={!!flow} onOpenChange={(o) => { if (!o) { setFlow(null); setShowAll(false); } }}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle className="font-heading text-lg text-gold">{title}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {flow?.kind === "goal" && flow.step === "assist" && (
                <button type="button" onClick={() => onPick(null)} className="col-span-2 rounded-xl border-2 border-dashed border-border p-4 font-heading text-muted-foreground sm:col-span-3">
                  Sem assistência
                </button>
              )}
              {pickerPlayers().map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPick(p.id)}
                  className="flex items-center gap-2 rounded-xl border-2 border-border bg-muted/50 p-3 text-left active:border-gold active:bg-gold/10"
                >
                  <PlayerAvatar player={p} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{p.nickname}</span>
                    {teamOf.get(p.id) && (
                      <span className="text-[10px] text-muted-foreground">
                        {teamOf.get(p.id) === "A" ? match.team_a_name : match.team_b_name}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
            {!showAll && (
              <Button variant="ghost" className="mt-3 w-full" onClick={() => setShowAll(true)}>
                Mostrar todos os jogadores
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
