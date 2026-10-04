"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { percent, periodName } from "@/lib/format";
import type { EvalReport, EvalScope, MatcherCard } from "@/lib/types";
import { ErrorState, Heading, PageTitle, Skeleton } from "@/components/ui";

const CASE_NAMES: Record<string, string> = {
  AMOUNT_MISMATCH: "Booked amount differs from the invoice",
  BUNDLED_PAYMENT: "One payment for two invoices",
  DATE_MISMATCH: "Booked in a different month",
  INVOICE_ID_MISMATCH: "Invoice number typed differently",
  PARTIAL_PAYMENT: "Invoice paid in instalments",
  PAYMENT_AMOUNT_MISMATCH: "Paid amount differs from the invoice",
  PAYMENT_BEFORE_INVOICE: "Paid before the invoice date",
  ROUNDING_NOISE: "Rounding difference under a rupee",
};
const SCOPES: { id: EvalScope; label: string }[] = [
  { id: "test", label: "Unseen months" },
  { id: "year", label: "Whole year" },
];

function Figure({ value, label, note, colour = "" }: { value: string; label: string; note: string; colour?: string }) {
  return (
    <div className="border-t-2 border-ink pt-4">
      <p className={`font-display text-[48px] font-extrabold leading-none ${colour}`}>{value}</p>
      <p className="mt-1 text-[16px] font-semibold">{label}</p>
      <p className="mt-1 text-[14px] text-ink-2">{note}</p>
    </div>
  );
}

function Compare({ label, baseline, model, lowerIsBetter = false }: { label: string; baseline: number; model: number; lowerIsBetter?: boolean }) {
  const better = lowerIsBetter ? model < baseline : model > baseline;
  return (
    <div className="grid grid-cols-[220px_1fr] items-center gap-4 border-b border-line-2 py-3">
      <span className="text-[15px]">{label}</span>
      <span className="grid gap-1.5">
        {[
          ["Simple rule score", baseline, "bg-ink-3"],
          ["Trained matcher", model, lowerIsBetter ? "bg-ink" : "bg-ok"],
        ].map(([name, value, colour]) => (
          <span key={name as string} className="grid grid-cols-[130px_1fr_64px] items-center gap-3">
            <span className="text-[13px] text-ink-2">{name}</span>
            <span className="h-3 rounded-bar bg-line-2">
              <span className={`block h-full rounded-bar ${colour}`} style={{ width: `${Math.max(0.5, (value as number) * 100)}%` }} />
            </span>
            <span className={`text-right font-mono text-[14px] ${name === "Trained matcher" && better ? "font-semibold" : ""}`}>{percent(value as number, 1)}</span>
          </span>
        ))}
      </span>
    </div>
  );
}

function Matcher({ card }: { card: MatcherCard }) {
  const cases = Object.entries(card.hard_cases);
  const traps = Object.entries(card.benign_traps);
  return (
    <section>
      <Heading note={`${card.model.positives.toLocaleString("en-IN")} true matches among ${card.model.pairs.toLocaleString("en-IN")} candidate pairs`}>{card.name}</Heading>
      <Compare label="True matches found" baseline={card.baseline.recall} model={card.model.recall} />
      <Compare label="Automatic matches that were right" baseline={card.baseline.precision} model={card.model.precision} />
      <Compare label="Automatic matches that were wrong" baseline={card.baseline.false_auto_rate} model={card.model.false_auto_rate} lowerIsBetter />
      <p className="mt-4 text-[15px] font-semibold">Hard cases in these months, and how many it still matched</p>
      <ul className="mt-1 text-[14px]">
        {cases.map(([name, c]) => (
          <li key={name} className="flex justify-between gap-4 border-b border-line-2 py-1.5">
            <span>{CASE_NAMES[name] ?? name}</span>
            <span className="font-mono">
              {Math.round(c.recall_auto * c.pairs)} of {c.pairs}
            </span>
          </li>
        ))}
        {traps.map(([name, c]) => (
          <li key={`trap-${name}`} className="flex justify-between gap-4 border-b border-line-2 py-1.5 text-ink-2">
            <span>Trap, matched and not flagged: {(CASE_NAMES[name] ?? name).toLowerCase()}</span>
            <span className="font-mono">
              {Math.round(c.matched * c.pairs)} of {c.pairs}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ProofPage() {
  const [scope, setScope] = useState<EvalScope>("test");
  const [report, setReport] = useState<EvalReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .evalReport(scope)
      .then((r) => !cancelled && (setReport(r), setError(null)))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [scope, attempt]);

  if (error) return <ErrorState message={error} onRetry={() => (setError(null), setAttempt(attempt + 1))} />;
  if (!report)
    return (
      <div className="grid gap-8">
        <Skeleton className="h-24 w-[520px]" />
        <Skeleton className="h-40" />
        <Skeleton className="h-96" />
      </div>
    );

  const stale = report.split !== scope;
  const rules = report.rows.filter((r) => r.source === "engine");
  const planted = rules.reduce((s, r) => s + r.planted, 0);
  const caught = rules.reduce((s, r) => s + r.caught, 0);
  const reported = rules.reduce((s, r) => s + r.reported, 0);
  const falseAlarms = rules.reduce((s, r) => s + r.false_alarms, 0);
  const onTraps = rules.reduce((s, r) => s + r.on_benign_traps, 0);
  const rows = [...report.rows].filter((r) => r.planted > 0 || r.reported > 0).sort((a, b) => (a.catch_rate ?? 1) - (b.catch_rate ?? 1) || b.false_alarms - a.false_alarms || b.planted - a.planted);
  const tallest = Math.max(1, ...report.by_month.map((m) => m.planted));
  const missed = report.misses.filter((m) => m.kind === "missed");
  const alarms = report.misses.filter((m) => m.kind === "false_alarm");

  return (
    <div className={`grid gap-14 pb-6 ${stale ? "opacity-60" : ""}`}>
      <div>
        <PageTitle
          title="Proof"
          lead="The data has mistakes planted on purpose and a list of every one. This page counts what LedgerLens caught, what it missed and what it flagged wrongly, and names each record."
          right={
            <div className="flex rounded-control border border-line bg-paper p-0.5" role="tablist" aria-label="Months to count">
              {SCOPES.map((s) => (
                <button key={s.id} role="tab" aria-selected={scope === s.id} onClick={() => setScope(s.id)} className={`rounded-bar px-4 py-1.5 font-semibold ${scope === s.id ? "bg-ink text-app-bg" : "text-ink-2"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          }
        />
        <div className="grid grid-cols-4 gap-x-10 px-2">
          <Figure value={percent(caught / (planted || 1), 1)} colour="text-ok" label="Catch rate" note={`${caught.toLocaleString("en-IN")} of ${planted.toLocaleString("en-IN")} planted mistakes found`} />
          <Figure value={String(planted - caught)} label={planted - caught === 1 ? "Planted mistake missed" : "Planted mistakes missed"} note="Each one is listed below" />
          <Figure value={String(falseAlarms)} label="False alarms" note={`${percent(falseAlarms / (reported || 1), 1)} of ${reported.toLocaleString("en-IN")} reported records were not planted`} />
          <Figure value={String(onTraps)} label="Findings on Benign traps" note="Records that look wrong but are fine: part payments, bundled payments, rounding" />
        </div>
        <p className="mt-6 max-w-[100ch] px-2 text-[15px] text-ink-2">
          {scope === "test"
            ? "Counted on February and March 2026 only, the two months the matchers never trained on. These are the numbers to quote."
            : "Counted on all twelve months. That includes the months the matchers trained on and the months the rule thresholds were chosen on, so read it as coverage, not as an unseen test."}
        </p>
      </div>

      <section className="px-2">
        <Heading note="planted mistakes: caught in green, missed in red">Month by month</Heading>
        <ol className="mt-8 grid grid-cols-12 items-end gap-3" aria-label="Planted mistakes caught and missed in each month">
          {report.by_month.map((m) => (
            <li key={m.period} className={`flex flex-col items-center gap-1.5 ${report.months.includes(m.period) ? "" : "opacity-45"}`}>
              <span className="font-mono text-[13px]">
                {m.caught}/{m.planted}
              </span>
              <span className="flex w-full flex-col overflow-hidden rounded-bar" style={{ height: `${(m.planted / tallest) * 150}px` }}>
                <span className="bg-bad" style={{ flexGrow: m.planted - m.caught }} />
                <span className="bg-ok" style={{ flexGrow: m.caught }} />
              </span>
              <span className="text-[14px] font-semibold">{periodName(m.period).slice(0, 3)}</span>
              <span className="text-[12px] text-ink-2">{m.false_alarms} false</span>
              <span className="h-4 text-[12px] font-semibold text-orange-deep">{m.unseen ? "unseen" : m.period === "2026-01" ? "tuning" : ""}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[14px] text-ink-2">
          April to December 2025 train the matchers, January 2026 sets their thresholds, February and March 2026 are never seen before scoring. The supplier ring is one label for the
          year, so it is left out of the monthly counts.
        </p>
      </section>

      <section className="px-2">
        <Heading note={`${missed.length} missed, ${alarms.length} flagged wrongly`}>Every miss, by record</Heading>
        {report.misses.length === 0 ? (
          <p className="mt-5 text-[16px]">Nothing was missed and nothing was flagged wrongly in these months.</p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>What went wrong</th>
                <th>Kind of Finding</th>
                <th>Record</th>
                <th>The detail</th>
              </tr>
            </thead>
            <tbody>
              {report.misses.map((m) => (
                <tr key={`${m.kind}-${m.finding_type}-${m.entity_id}`} className="align-top">
                  <td className="whitespace-nowrap font-semibold">
                    <span className={`mr-2 inline-block size-2 rounded-full ${m.kind === "missed" ? "bg-bad" : "bg-dup"}`} aria-hidden />
                    {m.kind === "missed" ? "Planted, not caught" : "Flagged, not planted"}
                  </td>
                  <td className="whitespace-nowrap">{m.label}</td>
                  <td className="num whitespace-nowrap text-[13px]">{m.entity_id}</td>
                  <td className="text-ink-2">
                    {m.detail}
                    {m.expected && m.recorded && (
                      <span>
                        . Expected <span className="num text-[13px] text-ink">{m.expected}</span>, recorded <span className="num text-[13px] text-ink">{m.recorded}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="px-2">
        <p className="max-w-[100ch] text-[16px] leading-relaxed">
          <span className="font-display text-[20px] font-bold">Two matchers are trained; everything else is a rule.</span> Each matcher is compared with a simple rule score built from
          the same clues (how close the invoice number, the amount, the date and the name are). The numbers below are for February and March 2026.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-12">
          {report.matchers.map((card) => (
            <Matcher key={card.kind} card={card} />
          ))}
        </div>
      </div>

      <section className="px-2">
        <Heading>How this was tested</Heading>
        <div className="mt-5 grid grid-cols-4 gap-x-10 text-[15px] leading-relaxed">
          <p>
            <span className="block font-display text-[20px] font-bold leading-tight">Split by month</span>
            <span className="mt-1.5 block text-ink-2">The product always scores a month it has not seen, so the test is the last two months of the year. Nothing is tuned on them.</span>
          </p>
          <p>
            <span className="block font-display text-[20px] font-bold leading-tight">What was planted</span>
            <span className="mt-1.5 block text-ink-2">
              Every kind of mistake and trap, with counts and examples, is on the{" "}
              <Link href="/data" className="font-semibold text-orange-deep hover:underline">
                Data page
              </Link>
              .
            </span>
          </p>
          <p>
            <span className="block font-display text-[20px] font-bold leading-tight">What a false alarm is</span>
            <span className="mt-1.5 block text-ink-2">A reported record that is not on the list of planted mistakes of that kind. Any report on a Benign trap counts too.</span>
          </p>
          <p>
            <span className="block font-display text-[20px] font-bold leading-tight">The limits</span>
            <span className="mt-1.5 block text-ink-2">
              The data is synthetic and cleaner than real books, so real books will be harder. The workbook marks unpaid purchase invoices as fine; LedgerLens reports them after 180
              days and scores that rule against its own labels.
            </span>
          </p>
        </div>
      </section>

      <section className="px-2">
        <Heading note="worst first">Every kind of Finding</Heading>
        <table className="data text-[14.5px]">
          <thead>
            <tr>
              <th>Kind</th>
              <th className="w-[30%]">Catch rate</th>
              <th className="right">Planted</th>
              <th className="right">Caught</th>
              <th className="right">False alarms</th>
              <th className="right">False alarm rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.finding_type}>
                <td>
                  {row.label}
                  {row.source === "ml" && <span className="ml-2 text-[13px] font-semibold text-miss">trained matcher</span>}
                </td>
                <td>
                  <span className="flex items-center gap-3">
                    <span className="h-2.5 flex-1 rounded-bar bg-line-2">
                      <span className={`block h-full rounded-bar ${(row.catch_rate ?? 0) >= 0.9 ? "bg-ok" : "bg-dup"}`} style={{ width: `${(row.catch_rate ?? 0) * 100}%` }} />
                    </span>
                    <span className="num w-12 font-semibold">{percent(row.catch_rate)}</span>
                  </span>
                </td>
                <td className="num right">{row.planted}</td>
                <td className="num right">{row.caught}</td>
                <td className="num right">{row.false_alarms}</td>
                <td className="num right">{percent(row.false_alarm_rate, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
