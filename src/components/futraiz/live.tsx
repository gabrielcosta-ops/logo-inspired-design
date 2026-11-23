import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { useNow } from "@/lib/futraiz/data";
import { clockSeconds, formatClock, matchScore, matchWinner } from "@/lib/futraiz/stats";
import type { Match, MatchEvent, Player } from "@/lib/futraiz/types";
import { cn } from "@/lib/utils";
import { CardChip } from "./player-bits";

export function describeEvent(e: MatchEvent, players: Map<string, Player>) {
  const who = (e.player_id && players.get(e.player_id)?.nickname) || "Alguém";
  const assist = e.assist_player_id ? players.get(e.assist_player_id)?.nickname : undefined;
  switch (e.type) {
    case "goal":
      return { icon: "⚽", text: assist ? `Gol do ${who}, assistência do ${assist}` : `Gol do ${who}` };
    case "own_goal":
      return { icon: "🙈", text: `Gol contra do ${who}` };
    case "yellow":
      return { icon: <CardChip color="yellow" />, text: `Cartão amarelo pro ${who}` };
    case "red":
      return { icon: <CardChip color="red" />, text: `Cartão vermelho pro ${who}` };
  }
}

export function MatchClock({ match, className }: { match: Match; className?: string }) {
  const running = !!match.clock_started_at && match.status === "live";
  const now = useNow(1000, running);
  return <span className={cn("led", className)}>{formatClock(clockSeconds(match, now))}</span>;
}

export function Scoreboard({ match, events, compact }: { match: Match; events: MatchEvent[]; compact?: boolean }) {
  const score = matchScore(events);
  const isLive = match.status === "live";
  return (
    <div className="scoreboard rounded-2xl p-3 sm:p-5">
      <div className="mb-2 flex items-center justify-center gap-2 font-heading text-xs">
        {isLive ? (
          <span className="flex items-center gap-1.5 rounded bg-card-red px-2 py-0.5 text-cream">
            <span className="h-2 w-2 rounded-full bg-cream animate-live" /> Ao vivo
          </span>
        ) : (
          <span className="rounded bg-muted px-2 py-0.5 text-muted-foreground">Encerrado</span>
        )}
        <MatchClock match={match} className="text-lg" />
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <TeamName name={match.team_a_name} side="A" />
        <div className={cn("led flex items-center gap-2 font-bold", compact ? "text-5xl" : "text-6xl sm:text-8xl")}>
          <span>{score.A}</span>
          <span className="text-muted-foreground/60">×</span>
          <span>{score.B}</span>
        </div>
        <TeamName name={match.team_b_name} side="B" />
      </div>
    </div>
  );
}

function TeamName({ name, side }: { name: string; side: "A" | "B" }) {
  return (
    <div className={cn("flex min-w-0 flex-col items-center gap-1", side === "B" && "order-last")}>
      <span className={cn("h-2 w-12 rounded-full", side === "A" ? "bg-card-yellow" : "bg-grass")} />
      <span className="w-full truncate text-center font-heading text-base text-cream sm:text-xl">{name}</span>
    </div>
  );
}

export function EventFeed({ events, players, match }: { events: MatchEvent[]; players: Map<string, Player>; match: Match }) {
  if (events.length === 0) return <p className="py-4 text-center text-sm text-muted-foreground">Nenhum lance ainda. Bola rolando!</p>;
  return (
    <ul className="space-y-1.5">
      {[...events].reverse().map((e) => {
        const d = describeEvent(e, players);
        return (
          <li key={e.id} className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm animate-in fade-in slide-in-from-top-2">
            <span className="w-9 shrink-0 font-heading text-gold">{e.minute ?? 0}'</span>
            <span className="shrink-0 text-base">{d.icon}</span>
            <span className="min-w-0 flex-1">{d.text}</span>
            <span className={cn("shrink-0 rounded px-1.5 font-heading text-[10px]", e.team === "A" ? "bg-card-yellow/20 text-card-yellow" : "bg-grass/20 text-grass")}>
              {e.team === "A" ? match.team_a_name : match.team_b_name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function MatchHistory({ matches, events, players }: { matches: Match[]; events: MatchEvent[]; players: Map<string, Player> }) {
  const [open, setOpen] = useState<string | null>(null);
  if (matches.length === 0) return <p className="py-10 text-center text-muted-foreground">Nenhum jogo nessa temporada ainda.</p>;
  return (
    <ul className="space-y-3">
      {matches.map((m) => {
        const evs = events.filter((e) => e.match_id === m.id);
        const s = matchScore(evs);
        const w = m.status === "finished" ? matchWinner(m, evs) : null;
        return (
          <li key={m.id} className="overflow-hidden rounded-xl border border-border bg-card">
            <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="w-full px-4 py-3 text-left">
              <div className="mb-1 flex items-center justify-between font-heading text-[11px] text-muted-foreground">
                <span>{format(new Date(m.played_at + "T12:00:00"), "EEE, dd 'de' MMM", { locale: ptBR })}</span>
                {m.status === "live" ? <span className="text-card-red animate-live">● Ao vivo</span> : <span>{w === "draw" ? "Empate" : "Encerrado"}</span>}
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3">
                <span className={cn("truncate font-heading text-lg", w === "A" && "text-gold")}>{m.team_a_name}</span>
                <span className="led text-3xl font-bold">{s.A} × {s.B}</span>
                <span className={cn("truncate text-right font-heading text-lg", w === "B" && "text-gold")}>{m.team_b_name}</span>
              </div>
            </button>
            {open === m.id && (
              <div className="border-t border-border px-3 py-3">
                <EventFeed events={evs} players={players} match={m} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
