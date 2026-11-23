import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useMemo } from "react";
import { SiteHeader } from "@/components/futraiz/brand";
import { CelebrationOverlay, useCelebrations } from "@/components/futraiz/celebrations";
import { EventFeed, MatchHistory, Scoreboard } from "@/components/futraiz/live";
import { LeaderList, RankingBoard } from "@/components/futraiz/ranking";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFutraiz, useLiveSync } from "@/lib/futraiz/data";
import { rankBy, rankByPoints } from "@/lib/futraiz/stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FUTRAIZ ao vivo — placar e ranking do racha" },
      { name: "description", content: "Acompanhe o racha ao vivo: placar, lances, ranking com coroa, artilheiros e garçons." },
      { property: "og:title", content: "FUTRAIZ ao vivo — placar e ranking do racha" },
      { property: "og:description", content: "Placar ao vivo, ranking com coroa, artilheiros e garçons do racha da galera." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PublicPanel,
});

function PublicPanel() {
  const { derived: d, isLoading, error } = useFutraiz();
  const celebrations = useCelebrations(d?.playerById, d?.levelByRank);
  useLiveSync({ onGoal: celebrations.onGoal, onLevelUp: celebrations.onLevelUp });

  const ranked = useMemo(() => (d ? rankByPoints(d.seasonStats) : []), [d]);
  const scorers = useMemo(() => (d ? rankBy(d.seasonStats, "goals") : []), [d]);
  const assisters = useMemo(() => (d ? rankBy(d.seasonStats, "assists") : []), [d]);

  return (
    <div className="min-h-dvh pb-16">
      <SiteHeader
        subtitle={d?.currentSeason?.name}
        right={
          <Link to="/admin" className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 font-heading text-xs text-muted-foreground hover:text-gold">
            <Lock className="h-3.5 w-3.5" /> Admin
          </Link>
        }
      />
      <main className="mx-auto max-w-5xl space-y-5 px-3 pt-4 sm:px-4">
        {error && <p className="rounded-lg bg-destructive/20 p-3 text-sm">Não deu pra carregar agora. Tenta atualizar a página.</p>}
        {isLoading || !d ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {d.liveMatch && (
              <section className="space-y-3">
                <Scoreboard match={d.liveMatch} events={d.liveEvents} />
                <div className="rounded-xl border border-border bg-card p-3">
                  <h2 className="mb-2 font-heading text-sm text-gold">Lances</h2>
                  <EventFeed events={d.liveEvents} players={d.playerById} match={d.liveMatch} />
                </div>
              </section>
            )}

            <Tabs defaultValue="ranking">
              <TabsList className="grid h-auto w-full grid-cols-4 bg-muted p-1">
                <TabsTrigger value="ranking" className="font-heading text-xs data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground sm:text-sm">Ranking</TabsTrigger>
                <TabsTrigger value="gols" className="font-heading text-xs data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground sm:text-sm">Artilheiros</TabsTrigger>
                <TabsTrigger value="assist" className="font-heading text-xs data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground sm:text-sm">Garçons</TabsTrigger>
                <TabsTrigger value="jogos" className="font-heading text-xs data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground sm:text-sm">Jogos</TabsTrigger>
              </TabsList>
              <TabsContent value="ranking" className="mt-4">
                <RankingBoard ranked={ranked} levels={d.levelByRank} />
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Gol = {d.settings.goal_points} pts · Assistência = {d.settings.assist_points} pts
                </p>
              </TabsContent>
              <TabsContent value="gols" className="mt-4">
                <LeaderList ranked={scorers} stat="goals" label="gols" levels={d.levelByRank} />
              </TabsContent>
              <TabsContent value="assist" className="mt-4">
                <LeaderList ranked={assisters} stat="assists" label="assist." levels={d.levelByRank} />
              </TabsContent>
              <TabsContent value="jogos" className="mt-4">
                <MatchHistory matches={d.seasonMatches} events={d.seasonEvents} players={d.playerById} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      <CelebrationOverlay item={celebrations.current} onDone={celebrations.dismiss} />
    </div>
  );
}
