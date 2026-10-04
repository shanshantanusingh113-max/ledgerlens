"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useRun } from "@/lib/run-store";
import { IMPACT_WORDS, date, percent, periodName, rupees, rupeesShort } from "@/lib/format";
import type { Category, FindingRow, Liability, Summary } from "@/lib/types";
import { FindingDrawer } from "@/components/FindingDrawer";
import { CauseBar, MoneyStrip } from "@/components/MoneyStrip";
import { CATEGORY_NAME, EmptyState, Heading, Skeleton } from "@/components/ui";

const CATEGORY_NOTE: Record<Category, string> = {
  missing: "not in GSTR-2B, books or bank",
  tax: "rate, tax type or arithmetic",
  anomaly: "unusual, each with a reason",
  matching: "amount, date or number differs",
  duplicate: "entered, booked or paid twice",
  filing: "the filed return",
};

function Donut({ summary }: { summary: Summary }) {
  const c = summary.match_counts;
  const parts = [
    { label: "Matched automatically", value: c.auto, colour: "var(--ok)" },
    { label: "One-to-many", value: c.one_to_many, colour: "var(--miss)" },
    { label: "Needs review", value: c.review, colour: "var(--dup)" },
    { label: "Unmatched", value: c.unmatched, colour: "var(--bad)" },
  ];
  const total = parts.reduce((sum, p) => sum + p.value, 0) || 1;
  const matched = ((c.auto + c.one_to_many) / total) * 100;
  const radius = 54;
  const around = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex items-center gap-10">
      <svg viewBox="0 0 140 140" className="size-52 shrink-0 -rotate-90" role="img" aria-label={`${matched.toFixed(1)} percent of matches needed no one`}>
        {parts.map((p) => {
          const length = (p.value / total) * around;
          const arc = <circle key={p.label} cx="70" cy="70" r={radius} fill="none" stroke={p.colour} strokeWidth="16" strokeDasharray={`${length} ${around - length}`} strokeDashoffset={-offset} />;
          offset += length;
          return arc;
        })}
        <text x="70" y="70" textAnchor="middle" transform="rotate(90 70 70)" className="fill-ink font-display text-[26px] font-extrabold">
          {matched.toFixed(1)}%
        </text>
        <text x="70" y="86" textAnchor="middle" transform="rotate(90 70 70)" className="fill-ink-2 text-[9px]">
          needed no one
        </text>
      </svg>
      <ul className="grid flex-1 gap-3">
        {parts.map((p) => (
          <li key={p.label} className="flex items-baseline gap-3 border-b border-line-2 pb-3 last:border-b-0">
            <span className="size-3 shrink-0 translate-y-[1px] rounded-full" style={{ background: p.colour }} aria-hidden />
            <span className="text-[16px]">{p.label}</span>
            <span className="ml-auto font-display text-[24px] font-bold leading-none">{p.value.toLocaleString("en-IN")}</span>
          </li>
        ))}
        <li className="text-[14px] text-ink-2">{c.open} invoices are open (not yet due or unpaid), which is normal.</li>
      </ul>
    </div>
  );
}

function TaxTypes({ liability }: { liability: Liability }) {
  const largest = Math.max(1, ...liability.by_tax_type.map((t) => t.output_paise));
  return (
    <ul className="grid gap-5">
      {liability.by_tax_type.map((t) => (
        <li key={t.tax_type} className="grid grid-cols-[64px_1fr_120px] items-center gap-4">
          <span className="font-display text-[22px] font-bold uppercase">{t.tax_type}</span>
          <span className="grid gap-1.5">
            <span className="flex items-center gap-3">
              <span className="h-3 rounded-bar bg-ink" style={{ width: `${(t.output_paise / largest) * 100}%` }} />
              <span className="whitespace-nowrap font-mono text-[13px]">{rupeesShort(t.output_paise)} output</span>
            </span>
            <span className="flex items-center gap-3">
              <span className="h-3 rounded-bar bg-ok" style={{ width: `${Math.max(1, (t.eligible_itc_paise / largest) * 100)}%` }} />
              <span className="whitespace-nowrap font-mono text-[13px]">{rupeesShort(t.eligible_itc_paise)} credit</span>
            </span>
          </span>
          <span className="text-right">
            <span className="block font-display text-[24px] font-bold leading-none">{rupeesShort(t.net_paise)}</span>
            <span className="text-[13px] text-ink-2">to pay</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function DashboardPage() {
  const { summary, runId } = useRun();
  const [openId, setOpenId] = useState<string | null>(null);
  const [rateChange, setRateChange] = useState<FindingRow[]>([]);
  const [liability, setLiability] = useState<Liability | null>(null);

  useEffect(() => {
    if (!runId) return;
    api
      .findings(runId, { finding_type: "WRONG_TAX_RATE", status: "open" })
      .then((r) => setRateChange(r.items.filter((f) => f.title.includes(" since "))))
      .catch(() => setRateChange([]));
    api.liability(runId).then(setLiability).catch(() => setLiability(null));
  }, [runId, summary]);

  if (!summary)
    return (
      <div className="grid gap-8">
        <Skeleton className="h-52" />
        <Skeleton className="h-40" />
        <Skeleton className="h-80" />
      </div>
    );

  const c = summary.match_counts;
  const openFindings = summary.finding_counts_by_status.open ?? 0;
  const first = summary.top_findings[0];
  const kinds = (Object.entries(summary.finding_counts_by_category) as [Category, number][]).sort((a, b) => b[1] - a[1]);
  const largestKind = Math.max(1, ...kinds.map(([, n]) => n));
  const declared = liability?.declared;
  const filedWidth = declared ? Math.min(100, (declared.net_paise / Math.max(declared.net_paise, summary.net_payable_paise)) * 100) : 0;
  const computedWidth = declared ? Math.min(100, (summary.net_payable_paise / Math.max(declared.net_paise, summary.net_payable_paise)) * 100) : 0;

  return (
    <div className="grid gap-12 pb-6">
      <div>
        <div className="flex items-end justify-between gap-6 px-2">
          <div>
            <p className="micro">Dashboard</p>
            <h1 className="mt-2 font-display text-[52px] font-extrabold leading-[0.94] tracking-[-0.03em]">{periodName(summary.period)}</h1>
          </div>
          <p className="pb-1.5 text-right text-[15px] leading-relaxed text-ink-2">
            <span className="num text-ink">{summary.invoice_count.toLocaleString("en-IN")}</span> invoices checked against the ledger, the bank statement and GSTR-2B
            <br />
            <span className="num text-ink">{openFindings}</span> open Findings
          </p>
        </div>

        <div className="mt-5">
          <MoneyStrip money={summary} />
        </div>

        <ul className="mt-3 divide-y divide-line border-b border-line text-[16px]">
          <li>
            {first ? (
              <button onClick={() => setOpenId(first.id)} className="row-action flex w-full items-center gap-4 px-2 py-3 text-left">
                <span className="w-28 shrink-0 whitespace-nowrap font-display text-[18px] font-bold leading-none text-orange-deep">Start here</span>
                <span className="flex-1 text-pretty">
                  <b>{first.title}.</b> The evidence, the rule and a drafted fix are ready.
                </span>
                <span className="row-cta text-[15px]">
                  See why and fix <ArrowRight className="size-4" aria-hidden />
                </span>
              </button>
            ) : (
              <p className="flex items-center gap-4 px-2 py-3.5">
                <span className="w-28 shrink-0 whitespace-nowrap font-display text-[18px] font-bold leading-none text-ok">All clear</span>
                Every Finding has been approved or dismissed.
              </p>
            )}
          </li>
          {rateChange.length > 0 && (
            <li>
              <button onClick={() => setOpenId(rateChange[0].id)} className="row-action flex w-full items-center gap-4 px-2 py-3 text-left">
                <span className="w-28 shrink-0 whitespace-nowrap font-display text-[18px] font-bold leading-none text-bad">Rate change</span>
                <span className="flex-1 text-pretty">
                  <b>
                    {rateChange.length} {rateChange.length === 1 ? "invoice" : "invoices"} this month still {rateChange.length === 1 ? "uses" : "use"} a GST rate that ended on 22 Sep 2025.
                  </b>{" "}
                  {rupees(rateChange.reduce((sum, f) => sum + f.impact_paise, 0))} in all. Largest: <span className="font-mono text-[14px]">{rateChange[0].record_refs[0]?.id}</span>.
                </span>
                <span className="row-cta text-[15px]">
                  See why and fix <ArrowRight className="size-4" aria-hidden />
                </span>
              </button>
            </li>
          )}
        </ul>
      </div>

      <section className="px-2">
        <Heading note="one bar is the whole amount; each invoice counted once">Why credit is at risk</Heading>
        {summary.itc_at_risk_by_cause.length === 0 ? (
          <EmptyState title="No ITC at risk in this period" />
        ) : (
          <div className="mt-6">
            <CauseBar causes={summary.itc_at_risk_by_cause} total={summary.itc_at_risk_paise} />
          </div>
        )}
      </section>

      <section className="px-2">
        <Heading note={`${summary.top_findings.length} largest of ${openFindings} open Findings`}>Fix these first</Heading>
        {summary.top_findings.length === 0 ? (
          <EmptyState title="No open Findings in this period" hint="Every Finding has been approved or dismissed." />
        ) : (
          <ol>
            {summary.top_findings.map((f, i) => (
              <li key={f.id} className="border-b border-line">
                <button onClick={() => setOpenId(f.id)} className="row-action grid w-full grid-cols-[28px_170px_minmax(0,1fr)_120px_auto] items-center gap-4 py-3.5 pr-2 text-left">
                  <span className="pl-1 font-display text-[20px] font-bold text-ink-3">{i + 1}</span>
                  <span className="font-display text-[26px] font-bold leading-none">{f.impact_type === "none" ? "" : rupees(f.impact_paise)}</span>
                  <span>
                    <span className="text-[16px] font-semibold">{f.label}</span>
                    <span className="block text-[14px] text-ink-2">
                      {f.party?.name ?? "Company"}, <span className="font-mono text-[13px]">{f.record_refs[0]?.id}</span>, {IMPACT_WORDS[f.impact_type]}
                      {f.deadline ? `, due ${date(f.deadline)}` : ""}
                    </span>
                  </span>
                  <span className="text-[14px] text-ink-2">{percent(f.confidence)} sure</span>
                  <span className="row-cta text-[15px]">
                    See why and fix <ArrowRight className="size-4" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
        <Link href="/workbench" className="btn mt-5 text-[15px]">
          All {openFindings} Findings in the workbench <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>

      <div className="grid grid-cols-2 gap-12 px-2">
        <section>
          <Heading note={`${(c.auto + c.one_to_many + c.review + c.unmatched).toLocaleString("en-IN")} matches`}>How the month matched</Heading>
          <div className="mt-6">
            <Donut summary={summary} />
          </div>
        </section>

        <section>
          <Heading note={`${openFindings} open`}>Findings by kind</Heading>
          <ol className="mt-5 grid gap-3.5">
            {kinds.map(([category, count]) => (
              <li key={category} className="grid grid-cols-[110px_1fr] items-center gap-4">
                <span className="text-[16px] font-semibold">{CATEGORY_NAME[category]}</span>
                <span className="flex items-center gap-3">
                  <span className="h-6 rounded-bar bg-ink" style={{ width: `${Math.max(1, (count / largestKind) * 50)}%` }} />
                  <span className="font-display text-[22px] font-bold leading-none">{count}</span>
                  <span className="truncate text-[14px] text-ink-2">{CATEGORY_NOTE[category]}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {liability && (
        <div className="grid grid-cols-2 gap-12 px-2">
          <section>
            <Heading note="output tax against eligible credit">What the month should cost</Heading>
            <div className="mt-6">
              <TaxTypes liability={liability} />
            </div>
          </section>

          {declared && (
            <section>
              <Heading note={`return filed ${date(declared.filed_on)}`}>The filed return against LedgerLens</Heading>
              <div className="mt-6 grid gap-5">
                <div>
                  <div className="flex items-baseline justify-between text-[16px]">
                    <span>The filed return declared</span>
                    <span className="font-display text-[24px] font-bold leading-none">{rupeesShort(declared.net_paise)}</span>
                  </div>
                  <div className="mt-2 h-3 rounded-bar bg-ink-3" style={{ width: `${filedWidth}%` }} />
                </div>
                <div>
                  <div className="flex items-baseline justify-between text-[16px]">
                    <span>LedgerLens works out</span>
                    <span className="font-display text-[24px] font-bold leading-none">{rupeesShort(summary.net_payable_paise)}</span>
                  </div>
                  <div className="mt-2 h-3 rounded-bar bg-ink" style={{ width: `${computedWidth}%` }} />
                </div>
                {liability.gap_paise !== null && (
                  <p className="text-[16px]">
                    <span className="font-display text-[24px] font-bold text-orange-deep">{rupees(Math.abs(liability.gap_paise))}</span>{" "}
                    {liability.gap_paise >= 0 ? "more to pay than the return said." : "less to pay than the return said."}
                  </p>
                )}
                <Link href="/liability" className="btn justify-self-start text-[15px]">
                  See the working by tax type <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </section>
          )}
        </div>
      )}

      <FindingDrawer findingId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
