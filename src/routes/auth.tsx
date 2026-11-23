import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Crest, Wordmark } from "@/components/futraiz/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no painel do admin — FUTRAIZ" },
      { name: "description", content: "Acesso do administrador do racha FUTRAIZ." },
      { property: "og:title", content: "Painel do admin — FUTRAIZ" },
      { property: "og:description", content: "Acesso do administrador do racha FUTRAIZ." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigate({ to: "/admin", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/admin` },
        });
        if (error) throw error;
        if (data.session) await navigate({ to: "/admin", replace: true });
        else setSent(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao entrar";
      toast.error(msg.includes("Invalid login") ? "E-mail ou senha errados" : msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="panel-crest w-full max-w-sm rounded-2xl p-6">
        <Link to="/" className="mb-4 flex flex-col items-center gap-2">
          <Crest className="h-28 w-28" />
          <Wordmark className="text-3xl" />
          <span className="font-heading text-xs text-gold">Painel do admin</span>
        </Link>
        {sent ? (
          <p className="rounded-lg bg-muted p-4 text-center text-sm">
            Mandamos um link de confirmação pro <b>{email}</b>. Abre o e-mail, confirma e depois entra aqui.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "in" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={busy}>
              {mode === "in" ? "Entrar" : "Criar conta"}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              {mode === "in" ? (
                <>
                  Primeira vez?{" "}
                  <button type="button" className="text-gold underline" onClick={() => setMode("up")}>
                    Criar conta de admin
                  </button>
                </>
              ) : (
                <>
                  A primeira conta criada vira o admin.{" "}
                  <button type="button" className="text-gold underline" onClick={() => setMode("in")}>
                    Já tenho conta
                  </button>
                </>
              )}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
