import { createFileRoute, Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { useMemo } from "react";
import { SiteHeader } from "@/components/futraiz/brand";
import { LevelBadge, PlayerAvatar } from "@/components/futraiz/player-bits";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useFutraiz, useLiveSync } from "@/lib/futraiz/data";
import { nextLevel, rankByPoints } from "@/lib/futraiz/stats";
import { POSITION_LABEL } from "@/lib/futraiz/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/jogador/$id")({
  head: () => ({
    meta: [
      { title: "Perfil do jogador — FUTRAIZ" },
      { name: "description", content: "Nível, gols, assistências e evolução do jogador no racha FUTRAIZ." },
      { property: "og:title", content: "Perfil do jogador — FUTRAIZ" },
      { property: "og:description", content: "Nível, gols, assistências e evolução do jogador no racha." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlayerProfile,
});

function Stat({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-muted/50 p-2 text-center">
      <div className={cn("font-heading text-2xl font-bold", highlight && "text-gold")}>{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function PlayerProfile() {
  const { id } = Route.useParams();
  const { derived: d, isLoading } = useFutraiz();
  useLiveSync();

  const info = useMemo(() => {
    if (!d) return null;
    const player = d.playerById.get(id);
    if (!player) return null;
    const season = d.seasonStats.find((s) => s.player.id === id);
    const career = d.careerById.get(id);
    const position = rankByPoints(d.seasonStats).findIndex((s) => s.player.id === id) + 1;
    const level = d.levelByRank.get(player.level_rank);
    const next = nextLevel(player.level_rank, d.levels);
    const history = d.levelChanges.filter((c) => c.player_id === id);
    const plays = d.events
      .filter((e) => e.type === "goal" && (e.player_id === id || e.assist_player_id === id))
      .slice()
      .reverse();
    const matchById = new Map(d.matches.map((m) => [m.id, m]));
    return { player, season, career, position, level, next, history, plays, matchById };
  }, [d, id]);

  return (
    <div className="min-h-dvh pb-16">
      <SiteHeader subtitle={d?.currentSeason?.name} />
      <main className="mx-auto max-w-2xl space-y-4 px-3 pt-4">
        <Link to="/" className="inline-flex items-center gap-1 font-heading text-xs text-muted-foreground hover:text-gold">
          <ArrowLeft className="h-4 w-4" /> Voltar pro ranking
        </Link>
        {isLoading || !d ? (
          <Skeleton className="h-64 w-full rounded-2xl" />
        ) : !info ? (
          <p className="py-10 text-center text-muted-foreground">Jogador não encontrado.</p>
        ) : (
          <>
            <section className="panel-crest overflow-hidden rounded-2xl">
              <div className="bg-pitch field-lines flex flex-col items-center gap-2 px-4 py-6 text-center">
                <PlayerAvatar player={info.player} size="xl" className="relative z-10 border-4 border-gold shadow-gold" />
                <h1 className="relative z-10 font-display text-3xl text-cream drop-shadow">{info.player.nickname}</h1>
                <p className="relative z-10 text-sm text-cream/80">
                  {info.player.name} · {POSITION_LABEL[info.player.position]}
                  {info.player.shirt_number != null && ` · camisa ${info.player.shirt_number}`}
                </p>
                <div className="relative z-10 flex items-center gap-2">
                  <LevelBadge rank={info.player.level_rank} name={info.level?.name} className="text-sm" />
                  {info.position > 0 && <span className="rounded bg-board/70 px-2 py-0.5 font-heading text-xs text-gold">{info.position}º no ranking</span>}
                </div>
              </div>
            </section>

            {info.next && info.career && (
              <section className="rounded-xl border border-border bg-card p-4">
                <h2 className="mb-3 font-heading text-sm text-gold">Rumo a {info.next.name}</h2>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="mb-1 flex justify-between"><span>Gols</span><span className="font-heading">{info.career.goals}/{info.next.min_goals}</span></div>
                    <Progress value={Math.min(100, (info.career.goals / Math.max(1, info.next.min_goals)) * 100)} />
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between"><span>Assistências</span><span className="font-heading">{info.career.assists}/{info.next.min_assists}</span></div>
                    <Progress value={Math.min(100, (info.career.assists / Math.max(1, info.next.min_assists)) * 100)} />
                  </div>
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-2 font-heading text-sm text-gold">Temporada</h2>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Pontos" value={info.season?.points ?? 0} highlight />
                <Stat label="Gols" value={info.season?.goals ?? 0} />
                <Stat label="Assist." value={info.season?.assists ?? 0} />
                <Stat label="Jogos" value={info.season?.games ?? 0} />
              </div>
              <h2 className="mb-2 mt-4 font-heading text-sm text-gold">Carreira</h2>
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Gols" value={info.career?.goals ?? 0} />
                <Stat label="Assist." value={info.career?.assists ?? 0} />
                <Stat label="Vitórias" value={info.career?.wins ?? 0} />
                <Stat label="Cartões" value={(info.career?.yellows ?? 0) + (info.career?.reds ?? 0)} />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 font-heading text-sm text-gold">Evolução de nível</h2>
              {info.history.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda não mudou de nível.</p>
              ) : (
                <ol className="relative space-y-3 border-l-2 border-gold/40 pl-4">
                  {info.history.map((c) => (
                    <li key={c.id} className="relative">
                      <span className={cn("absolute -left-[23px] top-1 h-3 w-3 rounded-full", c.to_rank > c.from_rank ? "bg-gold" : "bg-card-red")} />
                      <div className="flex flex-wrap items-center gap-1.5 text-sm">
                        <LevelBadge rank={c.from_rank} name={d.levelByRank.get(c.from_rank)?.name} />
                        <span>{c.to_rank > c.from_rank ? "⬆" : "⬇"}</span>
                        <LevelBadge rank={c.to_rank} name={d.levelByRank.get(c.to_rank)?.name} />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(c.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        {c.reason && ` · ${c.reason}`}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 font-heading text-sm text-gold">Gols e assistências</h2>
              {info.plays.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lance ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {info.plays.map((e) => {
                    const m = info.matchById.get(e.match_id);
                    const isGoal = e.player_id === id;
                    const other = isGoal
                      ? e.assist_player_id && d.playerById.get(e.assist_player_id)?.nickname
                      : e.player_id && d.playerById.get(e.player_id)?.nickname;
                    return (
                      <li key={e.id} className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                        <span className="text-base">{isGoal ? "⚽" : "🅰️"}</span>
                        <span className="min-w-0 flex-1">
                          {isGoal ? (other ? `Gol, assistência do ${other}` : "Gol") : `Assistência pro gol do ${other}`}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {m ? format(new Date(m.played_at + "T12:00:00"), "dd/MM") : ""} · {e.minute ?? 0}'
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
