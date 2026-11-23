import { format } from "date-fns";
import { Archive, RotateCcw } from "lucide-react";
import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import type { Derived } from "@/lib/futraiz/data";
import { useAdminRun } from "./common";

export function AdminSeason({ d }: { d: Derived }) {
  const run = useAdminRun();
  const [name, setName] = useState("");
  const past = d.seasons.filter((s) => !s.is_current);

  return (
    <div className="space-y-4">
      <section className="panel-crest rounded-2xl p-4">
        <p className="font-heading text-xs text-muted-foreground">Temporada atual</p>
        <h2 className="font-display text-2xl text-gold">{d.currentSeason?.name ?? "—"}</h2>
        <p className="text-sm text-muted-foreground">
          {d.seasonMatches.length} jogos · desde {d.currentSeason ? format(new Date(d.currentSeason.started_at), "dd/MM/yyyy") : "—"}
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="space-y-1">
          <Label htmlFor="season">Nome da próxima temporada</Label>
          <Input id="season" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Temporada 2027" />
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="gold" size="xl" className="w-full"><Archive /> Encerrar e arquivar</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar a temporada?</AlertDialogTitle>
              <AlertDialogDescription>
                O ranking começa do zero numa nova temporada. Os jogos e números de agora ficam guardados no histórico e
                continuam contando pra carreira e pros níveis.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => supabase.rpc("close_season", { p_new_name: name, p_reset: false }), "Nova temporada começou!")}>
                Encerrar e arquivar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="xl" className="w-full"><RotateCcw /> Zerar tudo dessa temporada</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Zerar a temporada?</AlertDialogTitle>
              <AlertDialogDescription>
                Apaga de vez todos os jogos, gols e assistências dessa temporada. Os jogadores e os níveis continuam. Não dá
                pra desfazer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => supabase.rpc("close_season", { p_new_name: name, p_reset: true }), "Temporada zerada")}>
                Zerar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {past.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-2 font-heading text-sm text-gold">Temporadas arquivadas</h3>
          <ul className="space-y-1 text-sm">
            {past.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.name}</span>
                <span className="text-muted-foreground">
                  {d.matches.filter((m) => m.season_id === s.id).length} jogos · até {s.ended_at ? format(new Date(s.ended_at), "dd/MM/yy") : "—"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
