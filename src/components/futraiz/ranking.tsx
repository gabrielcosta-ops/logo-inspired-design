import { Link } from "@tanstack/react-router";
import { LayoutGroup, motion } from "motion/react";
import type { PlayerStats } from "@/lib/futraiz/stats";
import type { Level } from "@/lib/futraiz/types";
import { cn } from "@/lib/utils";
import { CrownIcon, LevelBadge, Medal, PlayerAvatar } from "./player-bits";

const spring = { type: "spring", stiffness: 380, damping: 34 } as const;

function levelName(levels: Map<number, Level>, rank: number) {
  return levels.get(rank)?.name;
}

function Champion({ s, levels }: { s: PlayerStats; levels: Map<number, Level> }) {
  return (
    <motion.div layout layoutId={`rank-${s.player.id}`} transition={spring} className="order-2 flex flex-col items-center">
      <Link to="/jogador/$id" params={{ id: s.player.id }} className="group flex flex-col items-center">
        <div className="relative flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
          <div className="absolute inset-2 rounded-full bg-rays opacity-70 animate-rays" />
          <div className="absolute inset-6 rounded-full bg-halo animate-halo [mask:radial-gradient(circle,transparent_62%,black_63%)]" />
          <div className="absolute inset-0 animate-crown-orbit">
            <div className="absolute left-1/2 top-0 -translate-x-1/2">
              <div className="animate-crown-counter">
                <CrownIcon className="h-9 w-12 drop-shadow-[0_0_8px_var(--gold)] sm:h-11 sm:w-14" />
              </div>
            </div>
          </div>
          <PlayerAvatar player={s.player} size="xl" className="animate-glow border-4 border-gold" />
        </div>
        <span className="font-heading text-xs text-gold">1º lugar</span>
        <span className="font-display text-xl text-gold-gradient sm:text-2xl">{s.player.nickname}</span>
        <LevelBadge rank={s.player.level_rank} name={levelName(levels, s.player.level_rank)} className="mt-1" />
        <span className="mt-2 font-heading text-3xl font-bold text-gold">{s.points} <small className="text-sm">pts</small></span>
        <span className="text-xs text-muted-foreground">
          {s.goals} gols · {s.assists} assist. · {s.games} jogos
        </span>
      </Link>
    </motion.div>
  );
}

function Runner({ s, place, levels }: { s: PlayerStats; place: 2 | 3; levels: Map<number, Level> }) {
  return (
    <motion.div
      layout
      layoutId={`rank-${s.player.id}`}
      transition={spring}
      className={cn("flex flex-col items-center pt-12", place === 2 ? "order-1" : "order-3")}
    >
      <Link to="/jogador/$id" params={{ id: s.player.id }} className="flex flex-col items-center text-center">
        <div className="relative">
          <PlayerAvatar
            player={s.player}
            size="lg"
            className={place === 2 ? "border-4 border-silver" : "border-4 border-bronze"}
          />
          <Medal place={place} className="absolute -bottom-3 -right-4 h-12 w-9 drop-shadow-lg" />
        </div>
        <span className={cn("mt-4 font-heading text-xs", place === 2 ? "text-silver" : "text-bronze")}>{place}º lugar</span>
        <span className="font-display text-sm leading-tight sm:text-lg">{s.player.nickname}</span>
        <LevelBadge rank={s.player.level_rank} name={levelName(levels, s.player.level_rank)} className="mt-1" />
        <span className="mt-1 font-heading text-xl font-bold">{s.points} <small className="text-xs">pts</small></span>
        <span className="text-[11px] text-muted-foreground">
          {s.goals}G · {s.assists}A · {s.games}J
        </span>
      </Link>
    </motion.div>
  );
}

export function RankingBoard({ ranked, levels }: { ranked: PlayerStats[]; levels: Map<number, Level> }) {
  const [first, second, third, ...rest] = ranked;
  return (
    <LayoutGroup>
      <section className="panel-crest overflow-hidden rounded-2xl">
        <div className="bg-pitch field-lines px-2 pb-6 pt-4">
          <div className="relative z-10 grid grid-cols-3 items-start gap-1">
            {second && <Runner s={second} place={2} levels={levels} />}
            {first && <Champion s={first} levels={levels} />}
            {third && <Runner s={third} place={3} levels={levels} />}
          </div>
        </div>
      </section>

      {rest.length > 0 && (
        <section className="mt-4 overflow-hidden rounded-xl border border-border bg-card">
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_repeat(4,2.25rem)] items-center gap-1 border-b border-border bg-muted px-3 py-2 font-heading text-[11px] text-muted-foreground sm:grid-cols-[2.5rem_minmax(0,1fr)_repeat(4,3rem)]">
            <span>#</span>
            <span>Jogador</span>
            <span className="text-center">G</span>
            <span className="text-center">A</span>
            <span className="text-center">J</span>
            <span className="text-center text-gold">Pts</span>
          </div>
          <ol>
            {rest.map((s, i) => (
              <motion.li key={s.player.id} layout layoutId={`rank-${s.player.id}`} transition={spring} className="border-b border-border/60 last:border-0">
                <Link
                  to="/jogador/$id"
                  params={{ id: s.player.id }}
                  className="grid grid-cols-[2rem_minmax(0,1fr)_repeat(4,2.25rem)] items-center gap-1 px-3 py-2 transition-colors hover:bg-accent sm:grid-cols-[2.5rem_minmax(0,1fr)_repeat(4,3rem)]"
                >
                  <span className="font-heading text-lg text-muted-foreground">{i + 4}º</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <PlayerAvatar player={s.player} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{s.player.nickname}</span>
                      <LevelBadge rank={s.player.level_rank} name={levelName(levels, s.player.level_rank)} />
                    </span>
                  </span>
                  <span className="text-center font-heading">{s.goals}</span>
                  <span className="text-center font-heading">{s.assists}</span>
                  <span className="text-center font-heading text-muted-foreground">{s.games}</span>
                  <span className="text-center font-heading text-lg font-bold text-gold">{s.points}</span>
                </Link>
              </motion.li>
            ))}
          </ol>
        </section>
      )}
    </LayoutGroup>
  );
}

export function LeaderList({
  ranked,
  stat,
  label,
  levels,
}: {
  ranked: PlayerStats[];
  stat: "goals" | "assists";
  label: string;
  levels: Map<number, Level>;
}) {
  const list = ranked.filter((s) => s[stat] > 0);
  if (list.length === 0) return <p className="py-10 text-center text-muted-foreground">Ninguém marcou ainda nessa temporada.</p>;
  return (
    <ol className="overflow-hidden rounded-xl border border-border bg-card">
      {list.map((s, i) => (
        <motion.li key={s.player.id} layout transition={spring} className="border-b border-border/60 last:border-0">
          <Link to="/jogador/$id" params={{ id: s.player.id }} className="flex items-center gap-3 px-3 py-2 hover:bg-accent">
            <span className={cn("w-7 font-heading text-lg", i === 0 ? "text-gold" : "text-muted-foreground")}>{i + 1}º</span>
            <PlayerAvatar player={s.player} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{s.player.nickname}</span>
              <LevelBadge rank={s.player.level_rank} name={levels.get(s.player.level_rank)?.name} />
            </span>
            <span className="text-right">
              <span className="block font-heading text-2xl font-bold text-gold">{s[stat]}</span>
              <span className="block text-[10px] uppercase text-muted-foreground">{label}</span>
            </span>
          </Link>
        </motion.li>
      ))}
    </ol>
  );
}
