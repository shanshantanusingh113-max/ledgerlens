import { percent, rupees, rupeesShort } from "@/lib/format";
import type { Summary } from "@/lib/types";

type Money = Pick<Summary, "itc_at_risk_paise" | "itc_found_paise" | "net_payable_paise" | "excess_tax_paise" | "short_tax_paise">;
type Cause = Summary["itc_at_risk_by_cause"][number];

// Causes are sorted largest first, so a darker shade means a larger share.
const SHADES = [100, 78, 60, 46, 36, 28, 22, 16];
const shade = (i: number) => `color-mix(in srgb, var(--orange-deep) ${SHADES[Math.min(i, SHADES.length - 1)]}%, var(--cream))`;

function Kpi({ label, value, note, tone, pair = false }: { label: string; value: React.ReactNode; note: string; tone?: "ok" | "orange"; pair?: boolean }) {
  return (
    <div className="tile">
      <dt className="micro">{label}</dt>
      {/* Two amounts share one cell, so they are set smaller and may break at the slash. */}
      <dd className={`mt-2.5 flex min-h-9 items-end gap-x-1.5 font-display font-extrabold leading-[1.02] tracking-[-0.03em] ${pair ? "text-[clamp(1.3rem,1.9vw,1.85rem)]" : "tile-value whitespace-nowrap"} ${tone === "ok" ? "text-ok" : tone === "orange" ? "text-orange-deep" : ""}`}>{value}</dd>
      <dd className="mt-2 text-[13px] leading-snug text-ink-2">{note}</dd>
    </div>
  );
}

/** The month's four money numbers, in the order they are read. */
export function MoneyStrip({ money }: { money: Money }) {
  return (
    <dl className="tiles grid-cols-4">
      <Kpi label="ITC at risk" value={rupeesShort(money.itc_at_risk_paise)} tone="orange" note="Credit claimed that may be lost unless fixed" />
      <Kpi label="ITC found" value={rupeesShort(money.itc_found_paise)} tone="ok" note="In GSTR-2B, not yet claimed in the books" />
      <Kpi label="Net payable" value={rupeesShort(money.net_payable_paise)} note="Output tax less eligible credit" />
      <Kpi
        pair
        label="Tax charged in excess / short"
        value={
          <span>
            <span className="whitespace-nowrap">{rupeesShort(money.excess_tax_paise)}</span> <span className="text-ink-3">/</span> <span className="whitespace-nowrap">{rupeesShort(money.short_tax_paise)}</span>
          </span>
        }
        note="Tax on invoices that is too high or too low"
      />
    </dl>
  );
}

/** ITC at risk as one bar split by cause, with each cause named below it. */
export function CauseBar({ causes, total, columns = 4 }: { causes: Cause[]; total: number; columns?: 2 | 4 }) {
  return (
    <>
      <div className="flex h-10 gap-0.5 overflow-hidden rounded-bar" role="img" aria-label={causes.map((cause) => `${cause.label}: ${rupees(cause.paise)}`).join(", ")}>
        {causes.map((cause, i) => (
          <span key={cause.finding_type} title={`${cause.label}: ${rupees(cause.paise)}`} style={{ flexGrow: cause.paise, background: shade(i), minWidth: 4 }} />
        ))}
      </div>
      <ol className={`mt-5 grid gap-x-10 gap-y-4 ${columns === 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {causes.map((cause, i) => (
          <li key={cause.finding_type} className="flex items-start gap-3">
            <span className="mt-1.5 size-3 shrink-0 rounded-bar" style={{ background: shade(i) }} aria-hidden />
            <span>
              <span className="block text-[15px] leading-snug">{cause.label}</span>
              <span className="font-mono text-[15px] font-semibold">{rupees(cause.paise)}</span> <span className="text-[13px] text-ink-2">{percent(cause.paise / (total || 1))}</span>
            </span>
          </li>
        ))}
      </ol>
    </>
  );
}
