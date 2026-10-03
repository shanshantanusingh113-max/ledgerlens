"use client";

import { useState } from "react";
import { percent, periodName } from "@/lib/format";
import type { EvalMonth, EvalScope, PairMetrics } from "@/lib/types";

type Totals = { planted: number; caught: number; reported: number; false_alarms: number; on_benign_traps: number; months: string[] };
export type DemoProof = { test: Totals; year: Totals; by_month: EvalMonth[]; matchers: { kind: string; name: string; model: PairMetrics; baseline: PairMetrics }[] };

const SCOPES: { id: EvalScope; label: string }[] = [
  { id: "test", label: "Unseen months" },
  { id: "year", label: "Whole year" },
];

/** The measured results, with the same switch the Proof page has. */
export function ProofDemo({ proof }: { proof: DemoProof }) {
  const [scope, setScope] = useState<EvalScope>("test");
  const totals = proof[scope];
  const tallest = Math.max(1, ...proof.by_month.map((m) => m.planted));
  return (
    <div className="rounded-surface bg-paper p-7 shadow-float">
      <div className="flex items-center justify-between gap-4">
        <p className="font-display text-[22px] font-bold">Planted mistakes, caught and missed</p>
        <div className="flex rounded-control border border-line bg-paper p-0.5" role="tablist" aria-label="Months to count">
          {SCOPES.map((s) => (
            <button key={s.id} role="tab" aria-selected={scope === s.id} onClick={() => setScope(s.id)} className={`rounded-bar px-4 py-1.5 font-semibold ${scope === s.id ? "bg-ink text-app-bg" : "text-ink-2"}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-6">
        <div className="border-t-2 border-ink pt-3">
          <dd className="font-display text-[40px] font-extrabold leading-none text-ok">{percent(totals.caught / totals.planted, 1)}</dd>
          <dt className="mt-1 text-[14px] text-ink-2">
            {totals.caught.toLocaleString("en-IN")} of {totals.planted.toLocaleString("en-IN")} caught
          </dt>
        </div>
        <div className="border-t-2 border-ink pt-3">
          <dd className="font-display text-[40px] font-extrabold leading-none">{totals.planted - totals.caught}</dd>
          <dt className="mt-1 text-[14px] text-ink-2">missed, each listed by record</dt>
        </div>
        <div className="border-t-2 border-ink pt-3">
          <dd className="font-display text-[40px] font-extrabold leading-none">{totals.false_alarms}</dd>
          <dt className="mt-1 text-[14px] text-ink-2">false alarms in {totals.reported.toLocaleString("en-IN")} reports</dt>
        </div>
      </dl>

      <ol className="mt-7 grid grid-cols-12 items-end gap-2" aria-label="Planted mistakes caught and missed in each month">
        {proof.by_month.map((m) => (
          <li key={m.period} className={`flex flex-col items-center gap-1 transition-opacity ${totals.months.includes(m.period) ? "" : "opacity-35"}`}>
            <span className="font-mono text-[11px]">
              {m.caught}/{m.planted}
            </span>
            <span className="flex w-full flex-col overflow-hidden rounded-bar" style={{ height: `${(m.planted / tallest) * 90}px` }}>
              <span className="bg-bad" style={{ flexGrow: m.planted - m.caught }} />
              <span className="bg-ok" style={{ flexGrow: m.caught }} />
            </span>
            <span className="text-[12px] font-semibold">{periodName(m.period).slice(0, 3)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-[13px] text-ink-2">
        {scope === "test"
          ? "February and March 2026: months the matchers never trained on. These are the numbers to quote."
          : "All twelve months, including the ones the matchers trained on. Read it as coverage, not as an unseen test."}
      </p>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[15px] font-semibold">True matches found on the unseen months: trained matcher against a simple rule score</p>
        {proof.matchers.map((m) => (
          <div key={m.kind} className="mt-3 grid grid-cols-[190px_1fr] items-center gap-4 text-[14px]">
            <span>{m.name}</span>
            <span className="grid gap-1">
              {(
                [
                  ["Rule score", m.baseline.recall, "bg-ink-3"],
                  ["Matcher", m.model.recall, "bg-ok"],
                ] as const
              ).map(([name, value, colour]) => (
                <span key={name} className="grid grid-cols-[84px_1fr_56px] items-center gap-3">
                  <span className="text-[13px] text-ink-2">{name}</span>
                  <span className="h-2.5 rounded-bar bg-line-2">
                    <span className={`block h-full rounded-bar ${colour}`} style={{ width: `${value * 100}%` }} />
                  </span>
                  <span className="text-right font-mono">{percent(value, 1)}</span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
