"use client";

import { AlertTriangle, Inbox } from "lucide-react";
import type { Category, FindingRow } from "@/lib/types";
import { IMPACT_WORDS, rupees } from "@/lib/format";

const TONES = {
  ok: "bg-ok",
  bad: "bg-bad",
  dup: "bg-dup",
  miss: "bg-miss",
  orange: "bg-orange-deep",
  plain: "bg-ink-3",
} as const;
// The tint behind a chip. The label stays ink so contrast never leans on the tone colour.
const CHIPS = {
  ok: "bg-ok-soft border-ok/30",
  bad: "bg-bad-soft border-bad/30",
  dup: "bg-dup-soft border-dup/30",
  miss: "bg-miss-soft border-miss/30",
  orange: "bg-orange-soft border-orange/35",
  plain: "bg-inset",
} as const;
export type Tone = keyof typeof TONES;

export const CATEGORY_TONE: Record<Category, Tone> = { tax: "bad", missing: "miss", duplicate: "dup", matching: "orange", anomaly: "plain", filing: "bad" };
export const CATEGORY_NAME: Record<Category, string> = { tax: "Tax", missing: "Missing", duplicate: "Duplicate", matching: "Matching", anomaly: "Anomaly", filing: "Filing" };

export function Pill({ tone = "plain", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`chip ${CHIPS[tone]}`}>
      <span className={`size-1.5 shrink-0 rounded-full ${TONES[tone]}`} aria-hidden />
      {children}
    </span>
  );
}

export function impactTone(type: FindingRow["impact_type"]): Tone {
  return type === "itc_found" ? "ok" : type === "itc_at_risk" ? "orange" : type === "none" ? "plain" : "bad";
}

export function ImpactPill({ finding }: { finding: Pick<FindingRow, "impact_type" | "impact_paise"> }) {
  if (finding.impact_type === "none") return <Pill>No rupee impact</Pill>;
  return (
    <Pill tone={impactTone(finding.impact_type)}>
      {rupees(finding.impact_paise)} {IMPACT_WORDS[finding.impact_type]}
    </Pill>
  );
}

export function StatusPill({ status }: { status: FindingRow["status"] }) {
  if (status === "approved") return <Pill tone="ok">Approved</Pill>;
  if (status === "dismissed") return <Pill>Dismissed</Pill>;
  return <Pill tone="orange">Open</Pill>;
}

export function BandBadge({ band, layer }: { band: string; layer?: string }) {
  if (layer === "one_to_many") return <Pill tone="miss">One-to-many</Pill>;
  if (band === "auto") return <Pill tone="ok">Auto-matched</Pill>;
  if (band === "review") return <Pill tone="dup">Review</Pill>;
  return <Pill>Unmatched</Pill>;
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 border-t border-line px-6 py-16 text-center text-ink-2">
      <Inbox className="size-6 text-ink-3" aria-hidden />
      <p className="font-display text-[20px] font-bold text-ink">{title}</p>
      {hint && <p className="max-w-md text-[13px] leading-relaxed">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 border-l-2 border-bad bg-bad-soft px-4 py-3.5 text-ink">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-bad" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">Something went wrong</p>
        <p className="text-[13px] text-ink-2">{message}</p>
      </div>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** One figure in a row of figures, with the label above it and the money in the display face. */
export function Tile({ label, value, note, tone }: { label: string; value: React.ReactNode; note?: React.ReactNode; tone?: Tone }) {
  return (
    <div className="tile">
      <p className="micro">{label}</p>
      <p className={`tile-value mt-2.5 ${tone ? TONE_TEXT[tone] : ""}`}>{value}</p>
      {note && <p className="mt-2 text-[13px] text-ink-2">{note}</p>}
    </div>
  );
}

const TONE_TEXT: Record<Tone, string> = { ok: "text-ok", bad: "text-bad", dup: "text-dup", miss: "text-miss", orange: "text-orange-deep", plain: "text-ink" };

/** The heading of one section of a page: a title on a heavy rule, with an optional note on the right. */
export function Heading({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b-2 border-ink pb-3">
      <h2 className="font-display text-[28px] font-bold leading-tight">
        <span className="tick" aria-hidden />
        {children}
      </h2>
      {note && <span className="text-[14px] text-ink-2">{note}</span>}
    </div>
  );
}

export function PageTitle({ title, lead, right }: { title: string; lead: string; right?: React.ReactNode }) {
  return (
    <div className="mb-7 flex items-end justify-between gap-6 px-2">
      <div className="min-w-0">
        <h1 className="font-display text-[52px] font-extrabold leading-[0.94] tracking-[-0.03em]">{title}</h1>
        <p className="mt-4 max-w-3xl text-[16px] leading-relaxed text-ink-2">{lead}</p>
      </div>
      {right && <div className="shrink-0 pb-1">{right}</div>}
    </div>
  );
}
