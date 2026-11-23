import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { LevelBadge, PlayerAvatar } from "@/components/futraiz/player-bits";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { Derived } from "@/lib/futraiz/data";
import { fileToSquareDataUrl } from "@/lib/futraiz/photo";
import { POSITION_LABEL, type Player } from "@/lib/futraiz/types";
import { useAdminRun } from "./common";

type Draft = {
  id?: string;
  name: string;
  nickname: string;
  position: Player["position"];
  shirt_number: string;
  level_rank: number;
  photo_url: string | null;
};

const empty: Draft = { name: "", nickname: "", position: "meia", shirt_number: "", level_rank: 1, photo_url: null };

export function AdminPlayers({ d }: { d: Derived }) {
  const run = useAdminRun();
  const [draft, setDraft] = useState<Draft | null>(null);

  async function save() {
    if (!draft) return;
    if (!draft.nickname.trim() || !draft.name.trim()) { toast.error("Preenche nome e apelido"); return; }
    const row = {
      name: draft.name.trim(),
      nickname: draft.nickname.trim(),
      position: draft.position,
      shirt_number: draft.shirt_number ? Number(draft.shirt_number) : null,
      photo_url: draft.photo_url,
    };
    let ok: boolean;
    if (draft.id) {
      const id = draft.id;
      ok = await run(() => supabase.from("players").update(row).eq("id", id), "Jogador atualizado");
      const current = d.playerById.get(id);
      if (ok && current && current.level_rank !== draft.level_rank) {
        await run(() => supabase.rpc("set_player_level", { p_player: id, p_rank: draft.level_rank, p_reason: "Ajuste do admin" }));
      }
    } else {
      ok = await run(() => supabase.from("players").insert({ ...row, level_rank: draft.level_rank }), "Jogador cadastrado");
    }
    if (ok) setDraft(null);
  }

  async function pickPhoto(file: File | undefined) {
    if (!file || !draft) return;
    try {
      const url = await fileToSquareDataUrl(file);
      setDraft({ ...draft, photo_url: url });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Foto inválida");
    }
  }

  return (
    <div className="space-y-3">
      <Button variant="gold" size="xl" className="w-full" onClick={() => setDraft({ ...empty })}>
        <Plus /> Cadastrar jogador
      </Button>
      <ul className="overflow-hidden rounded-xl border border-border bg-card">
        {d.players.map((p) => (
          <li key={p.id} className="flex items-center gap-3 border-b border-border/60 px-3 py-2 last:border-0">
            <PlayerAvatar player={p} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{p.nickname}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <LevelBadge rank={p.level_rank} name={d.levelByRank.get(p.level_rank)?.name} />
                <span className="truncate">{POSITION_LABEL[p.position]}{p.shirt_number != null && ` · #${p.shirt_number}`}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Editar ${p.nickname}`}
              onClick={() =>
                setDraft({
                  id: p.id,
                  name: p.name,
                  nickname: p.nickname,
                  position: p.position,
                  shirt_number: p.shirt_number?.toString() ?? "",
                  level_rank: p.level_rank,
                  photo_url: p.photo_url,
                })
              }
            >
              <Pencil />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Excluir ${p.nickname}`}><Trash2 /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir {p.nickname}?</AlertDialogTitle>
                  <AlertDialogDescription>Os gols dele continuam no placar dos jogos, mas ele sai do ranking.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => run(() => supabase.from("players").delete().eq("id", p.id), "Jogador excluído")}>
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </li>
        ))}
      </ul>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-gold">{draft?.id ? "Editar jogador" : "Novo jogador"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <PlayerAvatar player={{ nickname: draft.nickname || "?", photo_url: draft.photo_url, shirt_number: draft.shirt_number ? Number(draft.shirt_number) : null }} size="lg" />
                <div className="space-y-1">
                  <Label htmlFor="photo">Foto</Label>
                  <Input id="photo" type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} />
                  {draft.photo_url && (
                    <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setDraft({ ...draft, photo_url: null })}>
                      Remover foto
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="nick">Apelido</Label>
                <Input id="nick" value={draft.nickname} onChange={(e) => setDraft({ ...draft, nickname: e.target.value })} placeholder="Zé Canela" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Posição</Label>
                  <Select value={draft.position} onValueChange={(v) => setDraft({ ...draft, position: v as Player["position"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(POSITION_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="num">Camisa</Label>
                  <Input id="num" inputMode="numeric" value={draft.shirt_number} onChange={(e) => setDraft({ ...draft, shirt_number: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Nível</Label>
                <Select value={String(draft.level_rank)} onValueChange={(v) => setDraft({ ...draft, level_rank: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {d.levels.map((l) => (
                      <SelectItem key={l.id} value={String(l.rank)}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="gold" size="lg" className="w-full" onClick={save}>Salvar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
