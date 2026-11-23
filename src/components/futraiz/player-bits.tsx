import type { Player } from "@/lib/futraiz/types";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-lg",
  lg: "h-20 w-20 text-2xl",
  xl: "h-28 w-28 text-4xl",
} as const;

export function PlayerAvatar({
  player,
  size = "md",
  className,
}: {
  player: Pick<Player, "nickname" | "photo_url" | "shirt_number">;
  size?: keyof typeof SIZE;
  className?: string | undefined;
}) {
  const initials = player.nickname
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÀ-Ú]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border-2 border-gold/70 bg-muted",
        SIZE[size],
        className,
      )}
    >
      {player.photo_url ? (
        <img src={player.photo_url} alt={player.nickname} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="jersey-stripes flex h-full w-full items-center justify-center">
          <span className="font-display text-cream drop-shadow">{player.shirt_number ?? initials}</span>
        </div>
      )}
    </div>
  );
}

const LEVEL_STYLE: Record<number, string> = {
  1: "bg-muted text-muted-foreground border-border",
  2: "bg-secondary text-cream border-grass/50",
  3: "bg-grass/20 text-grass border-grass/60",
  4: "bg-cream/10 text-cream border-cream/50",
  5: "bg-gold/15 text-gold border-gold/60",
  6: "bg-gold-gradient text-primary-foreground border-gold",
};

export function LevelBadge({ rank, name, className }: { rank: number; name?: string | undefined; className?: string | undefined }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-heading text-[10px] font-semibold leading-none sm:text-xs",
        LEVEL_STYLE[Math.min(6, Math.max(1, rank))],
        className,
      )}
    >
      {name ?? `Nível ${rank}`}
    </span>
  );
}

export function CrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 44" className={className} aria-hidden="true">
      <path
        d="M4 14 L18 26 L32 4 L46 26 L60 14 L54 38 H10 Z"
        fill="var(--gold)"
        stroke="var(--gold-deep)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="10" y="36" width="44" height="6" rx="1.5" fill="var(--gold-deep)" />
      <circle cx="32" cy="4" r="3.5" fill="var(--cream)" />
      <circle cx="4" cy="14" r="3" fill="var(--cream)" />
      <circle cx="60" cy="14" r="3" fill="var(--cream)" />
      <circle cx="32" cy="27" r="3.5" fill="var(--grass)" />
    </svg>
  );
}

export function Medal({ place, className }: { place: 2 | 3; className?: string }) {
  const color = place === 2 ? "var(--silver)" : "var(--bronze)";
  return (
    <svg viewBox="0 0 40 56" className={className} aria-label={place === 2 ? "Medalha de prata" : "Medalha de bronze"}>
      <path d="M8 0 H18 L24 20 H14 Z" fill="var(--grass)" />
      <path d="M32 0 H22 L16 20 H26 Z" fill="var(--grass-deep)" />
      <circle cx="20" cy="36" r="17" fill={color} stroke="var(--board)" strokeOpacity="0.4" strokeWidth="2" />
      <circle cx="20" cy="36" r="12" fill="none" stroke="var(--cream)" strokeOpacity="0.6" strokeWidth="1.5" />
      <text x="20" y="42" textAnchor="middle" fontSize="16" fontWeight="800" fill="var(--board)" fontFamily="Oswald, sans-serif">
        {place}
      </text>
    </svg>
  );
}

export function CardChip({ color }: { color: "yellow" | "red" }) {
  return (
    <span
      className={cn("inline-block h-4 w-3 rounded-[2px] align-middle", color === "yellow" ? "bg-card-yellow" : "bg-card-red")}
      aria-label={color === "yellow" ? "Cartão amarelo" : "Cartão vermelho"}
    />
  );
}
