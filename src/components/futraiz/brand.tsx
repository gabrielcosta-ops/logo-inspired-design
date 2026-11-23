import { Link } from "@tanstack/react-router";
import crest from "@/assets/futraiz_crest.png.asset.json";
import { cn } from "@/lib/utils";

export function Crest({ className }: { className?: string }) {
  return <img src={crest.url} alt="Escudo FUTRAIZ" className={cn("object-contain", className)} />;
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn("font-display text-cream leading-none", className)}>FUTRAIZ</span>;
}

export function SiteHeader({ subtitle, right }: { subtitle?: string | undefined; right?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-gold/30 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <Crest className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="min-w-0">
            <Wordmark className="block text-2xl sm:text-3xl" />
            {subtitle && <span className="block truncate font-heading text-xs text-gold">{subtitle}</span>}
          </div>
        </Link>
        {right}
      </div>
    </header>
  );
}
