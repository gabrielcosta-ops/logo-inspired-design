import { ChevronDown, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { LevelBadge, PlayerAvatar } from "@/components/futraiz/player-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { Derived } from "@/lib/futraiz/data";
import { suggestLevel } from "@/lib/futraiz/stats";
import type { Level } from "@/lib/futraiz/types";
import { useAdminRun } from "./common";

export function AdminLevels({ d }: { d: Derived }) {
  const run = useAdminRun();
  const [open, setOpen] = useState<string | null>(null);
  const maxRank = Math.max(...d.levels.map((l) => l.rank), 1);
  const minRank = Math.min(...d.levels.map((l) => l.rank), 1);

  const suggestions = d.players
    .filter((p) => p.active)
    .map((p) => {
      const c = d.careerById.get(p.id);
      return { p, c, to: c ? suggestLevel(c.goals, c.assists, p.level_rank, d.levels) : null };
    })
    .filter((x) => x.to);

  const setLevel = (id: string, rank: number, reason: string) =>
    run(() => supabase.rpc("set_player_level", { p_player: id, p_rank: rank, p_reason: reason }));

  return (
    <div className="space-y-5">
      <section>
        <h2 className="mb-2 flex items-center gap-1.5 font-heading text-sm text-gold"><Sparkles className="h-4 w-4" /> Sugestões de subida</h2>
        {suggestions.length === 0 ? (
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">Ninguém bateu a meta do próximo nível ainda.</p>
        ) : (
          <ul className="space-y-2">
            {suggestions.map(({ p, c, to }) => (
              <li key={p.id} className="panel-crest flex items-center gap-3 rounded-xl p-3">
                <PlayerAvatar player={p} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.nickname}</div>
                  <div className="flex flex-wrap items-center gap-1 text-xs">
                    <LevelBadge rank={p.level_rank} name={d.levelByRank.get(p.level_rank)?.name} /> →
                    <LevelBadge rank={to!.rank} name={to!.name} />
                    <span className="text-muted-foreground">({c?.goals}G {c?.assists}A)</span>
                  </div>
                </div>
                <Button variant="gold" onClick={() => setLevel(p.id, to!.rank, `Bateu a meta de ${to!.name}`)}>Aprovar</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-heading text-sm text-gold">Nível de cada jogador</h2>
        <ul className="overflow-hidden rounded-xl border border-border bg-card">
          {d.players.map((p) => {
            const history = d.levelChanges.filter((c) => c.player_id === p.id);
            return (
              <li key={p.id} className="border-b border-border/60 last:border-0">
                <div className="flex items-center gap-2 px-3 py-2">
                  <PlayerAvatar player={p} size="sm" />
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-1 text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.nickname}</span>
                      <LevelBadge rank={p.level_rank} name={d.levelByRank.get(p.level_rank)?.name} />
                    </span>
                    <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                  <Button variant="outline" size="icon" aria-label="Baixar nível" disabled={p.level_rank <= minRank} onClick={() => setLevel(p.id, p.level_rank - 1, "Rebaixado pelo admin")}>
                    <Minus />
                  </Button>
                  <Button variant="outline" size="icon" aria-label="Subir nível" disabled={p.level_rank >= maxRank} onClick={() => setLevel(p.id, p.level_rank + 1, "Promovido pelo admin")}>
                    <Plus />
                  </Button>
                </div>
                {open === p.id && (
                  <div className="bg-muted/40 px-4 py-2 text-xs">
                    {history.length === 0 ? (
                      <p className="text-muted-foreground">Sem mudanças de nível.</p>
                    ) : (
                      <ul className="space-y-1">
                        {history.map((c) => (
                          <li key={c.id} className="flex flex-wrap items-center gap-1">
                            <span className="text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yy")}</span>
                            <LevelBadge rank={c.from_rank} name={d.levelByRank.get(c.from_rank)?.name} /> →
                            <LevelBadge rank={c.to_rank} name={d.levelByRank.get(c.to_rank)?.name} />
                            {c.reason && <span className="text-muted-foreground">· {c.reason}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <LevelTargets levels={d.levels} />
      <PointsConfig goal={d.settings.goal_points} assist={d.settings.assist_points} />
    </div>
  );
}

function LevelTargets({ levels }: { levels: Level[] }) {
  const run = useAdminRun();
  const [rows, setRows] = useState(levels);
  useEffect(() => setRows(levels), [levels]);

  async function save() {
    for (const r of rows) {
      const ok = await run(() =>
        supabase.from("levels").update({ name: r.name, min_goals: r.min_goals, min_assists: r.min_assists }).eq("id", r.id),
      );
      if (!ok) return;
    }
    await run(async () => ({ error: null }), "Metas salvas");
  }

  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h2 className="mb-1 font-heading text-sm text-gold">Metas de cada nível</h2>
      <p className="mb-3 text-xs text-muted-foreground">Total de gols E assistências na carreira pra chegar no nível.</p>
      <div className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2 font-heading text-[11px] text-muted-foreground">
        <span>Nível</span><span className="text-center">Gols</span><span className="text-center">Assist.</span>
      </div>
      <div className="mt-1 space-y-2">
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_4rem_4rem] gap-2">
            <Input value={r.name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
            <Input inputMode="numeric" className="text-center" value={r.min_goals} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, min_goals: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} />
            <Input inputMode="numeric" className="text-center" value={r.min_assists} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, min_assists: Number(e.target.value.replace(/\D/g, "")) || 0 } : x)))} />
          </div>
        ))}
      </div>
      <Button variant="gold" className="mt-3 w-full" onClick={save}>Salvar metas</Button>
    </section>
  );
}

function PointsConfig({ goal, assist }: { goal: number; assist: number }) {
  const run = useAdminRun();
  const [g, setG] = useState(String(goal));
  const [a, setA] = useState(String(assist));
  useEffect(() => { setG(String(goal)); setA(String(assist)); }, [goal, assist]);
  return (
    <section className="rounded-xl border border-border bg-card p-3">
      <h2 className="mb-3 font-heading text-sm text-gold">Pontuação do ranking</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-sm">Pontos por gol
          <Input inputMode="numeric" value={g} onChange={(e) => setG(e.target.value.replace(/\D/g, ""))} />
        </label>
        <label className="space-y-1 text-sm">Pontos por assistência
          <Input inputMode="numeric" value={a} onChange={(e) => setA(e.target.value.replace(/\D/g, ""))} />
        </label>
      </div>
      <Button
        variant="gold"
        className="mt-3 w-full"
        onClick={() =>
          run(
            () => supabase.from("settings").update({ goal_points: Number(g) || 0, assist_points: Number(a) || 0, updated_at: new Date().toISOString() }).eq("id", 1),
            "Pontuação salva",
          )
        }
      >
        Salvar pontuação
      </Button>
    </section>
  );
}
