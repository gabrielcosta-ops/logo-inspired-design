import { useCallback, useEffect, useState } from "react";
import type { Level, MatchEvent, Player, LevelChange } from "@/lib/futraiz/types";
import { PlayerAvatar } from "./player-bits";

type Item =
  | { kind: "goal"; id: string; scorer?: Player | undefined; assist?: Player | undefined; own: boolean }
  | { kind: "level"; id: string; player?: Player | undefined; level?: Level | undefined };

export function useCelebrations(players: Map<string, Player> | undefined, levels: Map<number, Level> | undefined) {
  const [queue, setQueue] = useState<Item[]>([]);
  const onGoal = useCallback(
    (e: MatchEvent) =>
      setQueue((q) => [
        ...q,
        {
          kind: "goal",
          id: e.id,
          own: e.type === "own_goal",
          scorer: e.player_id ? players?.get(e.player_id) : undefined,
          assist: e.assist_player_id ? players?.get(e.assist_player_id) : undefined,
        },
      ]),
    [players],
  );
  const onLevelUp = useCallback(
    (c: LevelChange) =>
      setQueue((q) => [...q, { kind: "level", id: c.id, player: players?.get(c.player_id), level: levels?.get(c.to_rank) }]),
    [players, levels],
  );
  const dismiss = useCallback(() => setQueue((q) => q.slice(1)), []);
  return { current: queue[0], onGoal, onLevelUp, dismiss };
}

export function CelebrationOverlay({ item, onDone }: { item: Item | undefined; onDone: () => void }) {
  useEffect(() => {
    if (!item) return;
    const t = setTimeout(onDone, 3800);
    return () => clearTimeout(t);
  }, [item, onDone]);
  if (!item) return null;
  return (
    <button
      type="button"
      onClick={onDone}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 overflow-hidden bg-background/90 px-6 text-center backdrop-blur-sm animate-in fade-in"
      aria-live="assertive"
    >
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[160vmax] w-[160vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-rays animate-rays" />
      {item.kind === "goal" ? (
        <>
          <span className="relative text-6xl animate-ball">⚽</span>
          <h2 className="relative font-display text-6xl text-gold-gradient animate-gol sm:text-8xl">
            {item.own ? "GOL CONTRA!" : "GOOOOL!"}
          </h2>
          {item.scorer && (
            <div className="relative flex flex-col items-center gap-2 animate-in zoom-in-50 delay-300 duration-500 fill-mode-both">
              <PlayerAvatar player={item.scorer} size="xl" className="border-4 border-gold" />
              <span className="font-display text-3xl text-cream">{item.scorer.nickname}</span>
              {item.assist && <span className="font-heading text-lg text-gold">Assistência: {item.assist.nickname}</span>}
            </div>
          )}
        </>
      ) : (
        <>
          <span className="relative text-6xl animate-ball">⬆️</span>
          <h2 className="relative font-display text-5xl text-gold-gradient animate-gol sm:text-7xl">SUBIU DE NÍVEL!</h2>
          {item.player && (
            <div className="relative flex flex-col items-center gap-2 animate-in zoom-in-50 delay-300 duration-500 fill-mode-both">
              <PlayerAvatar player={item.player} size="xl" className="border-4 border-gold" />
              <span className="font-display text-3xl text-cream">{item.player.nickname}</span>
              {item.level && <span className="rounded bg-gold-gradient px-3 py-1 font-heading text-xl text-primary-foreground">{item.level.name}</span>}
            </div>
          )}
        </>
      )}
      <span className="relative mt-4 text-xs text-muted-foreground">toque pra fechar</span>
    </button>
  );
}
