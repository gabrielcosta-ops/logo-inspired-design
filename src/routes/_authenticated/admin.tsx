import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, LogOut, Share2 } from "lucide-react";
import { toast } from "sonner";
import { AdminLevels } from "@/components/futraiz/admin/admin-levels";
import { AdminLive } from "@/components/futraiz/admin/admin-live";
import { AdminPlayers } from "@/components/futraiz/admin/admin-players";
import { AdminSeason } from "@/components/futraiz/admin/admin-season";
import { SiteHeader } from "@/components/futraiz/brand";
import { MatchHistory } from "@/components/futraiz/live";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useFutraiz, useLiveSync } from "@/lib/futraiz/data";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel do admin — FUTRAIZ" },
      { name: "description", content: "Controle do racha: jogadores, placar ao vivo, níveis e temporada." },
      { property: "og:title", content: "Painel do admin — FUTRAIZ" },
      { property: "og:description", content: "Controle do racha: jogadores, placar ao vivo, níveis e temporada." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const tabClass = "font-heading text-xs data-[state=active]:bg-gold-gradient data-[state=active]:text-primary-foreground sm:text-sm";

function AdminPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { derived: d } = useFutraiz();
  useLiveSync();

  const role = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      return !!data;
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function share() {
    const url = window.location.origin;
    const text = `⚽ Acompanha o racha ao vivo no FUTRAIZ: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "FUTRAIZ", text, url });
        return;
      } catch {
        /* fall through to copy */
      }
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copiado! Cola no grupo do WhatsApp.");
  }

  const header = (
    <SiteHeader
      subtitle="Painel do admin"
      right={
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={share} aria-label="Compartilhar link do público"><Share2 /></Button>
          <Button variant="ghost" size="icon" asChild aria-label="Ver painel do público">
            <Link to="/"><ExternalLink /></Link>
          </Button>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sair"><LogOut /></Button>
        </div>
      }
    />
  );

  if (role.isLoading || !d) {
    return (
      <div className="min-h-dvh">
        {header}
        <div className="mx-auto max-w-3xl space-y-3 p-4"><Skeleton className="h-40" /><Skeleton className="h-64" /></div>
      </div>
    );
  }

  if (!role.data) {
    return (
      <div className="min-h-dvh">
        {header}
        <div className="mx-auto max-w-md p-6 text-center">
          <h1 className="font-display text-2xl text-gold">Sem acesso</h1>
          <p className="mt-2 text-sm text-muted-foreground">Essa conta ({user.email}) não é a do admin do racha.</p>
          <Button variant="outline" className="mt-4" onClick={signOut}>Entrar com outra conta</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-16">
      {header}
      <main className="mx-auto max-w-3xl px-3 pt-4">
        <Tabs defaultValue="jogo">
          <TabsList className="grid h-auto w-full grid-cols-5 bg-muted p-1">
            <TabsTrigger value="jogo" className={tabClass}>Jogo</TabsTrigger>
            <TabsTrigger value="partidas" className={tabClass}>Partidas</TabsTrigger>
            <TabsTrigger value="jogadores" className={tabClass}>Jogadores</TabsTrigger>
            <TabsTrigger value="niveis" className={tabClass}>Níveis</TabsTrigger>
            <TabsTrigger value="temporada" className={tabClass}>Temporada</TabsTrigger>
          </TabsList>
          <TabsContent value="jogo" className="mt-4"><AdminLive d={d} /></TabsContent>
          <TabsContent value="partidas" className="mt-4">
            <h2 className="mb-3 font-display text-2xl text-gold">Partidas</h2>
            <MatchHistory matches={d.matches} events={d.events} players={d.playerById} />
          </TabsContent>
          <TabsContent value="jogadores" className="mt-4"><AdminPlayers d={d} /></TabsContent>
          <TabsContent value="niveis" className="mt-4"><AdminLevels d={d} /></TabsContent>
          <TabsContent value="temporada" className="mt-4"><AdminSeason d={d} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
