"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRun } from "@/lib/run-store";
import { date, periodName, rupees } from "@/lib/format";
import type { Liability } from "@/lib/types";
import { ErrorState, PageTitle, Pill, Skeleton } from "@/components/ui";

const TAX_NAME = { igst: "IGST", cgst: "CGST", sgst: "SGST" };

export default function LiabilityPage() {
  const { runId, summary } = useRun();
  const [data, setData] = useState<Liability | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    setError(null);
    api.liability(runId).then(setData).catch((e: Error) => setError(e.message));
  }, [runId, summary]);

  if (error) return <ErrorState message={error} />;
  if (!data || !summary)
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-56" />
      </div>
    );

  const output = data.by_tax_type.reduce((s, r) => s + r.output_paise, 0);
  const itc = data.by_tax_type.reduce((s, r) => s + r.eligible_itc_paise, 0);
  const net = data.by_tax_type.reduce((s, r) => s + r.net_paise, 0);
  const late = data.declared && data.declared.filed_on > data.declared.due_on;

  return (
    <div>
      <PageTitle
        title="Liability"
        lead={`What ${periodName(summary.period)} should cost in GST once every Finding is applied, next to what the filed return declared.`}
        right={data.simplified_setoff ? <Pill>Simplified set-off: each tax type against its own credit</Pill> : undefined}
      />

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
        <section className="card p-5">
          <h2 className="mb-4 font-display text-[28px] font-bold leading-tight">Net payable by tax type</h2>
          <table className="data">
            <thead>
              <tr>
                <th>Tax type</th>
                <th className="right">Output tax on sales</th>
                <th className="right">Eligible ITC</th>
                <th className="right">Net payable</th>
              </tr>
            </thead>
            <tbody>
              {data.by_tax_type.map((row) => (
                <tr key={row.tax_type}>
                  <td className="font-semibold">{TAX_NAME[row.tax_type]}</td>
                  <td className="num right">{rupees(row.output_paise)}</td>
                  <td className="num right text-ok">{rupees(row.eligible_itc_paise)}</td>
                  <td className="num right font-semibold">{rupees(row.net_paise)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-ink font-semibold">
                <td>Total</td>
                <td className="num right">{rupees(output)}</td>
                <td className="num right text-ok">{rupees(itc)}</td>
                <td className="num right text-[17px] font-display">{rupees(net)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-[13px] text-ink-2">
            Eligible ITC is the credit on purchase invoices minus ITC at risk ({rupees(summary.itc_at_risk_paise)} open). Credit comes back when a Finding is dismissed, and approved corrections
            change output tax.
          </p>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-display text-[28px] font-bold leading-tight">Against the filed return</h2>
          {!data.declared ? (
            <p className="text-ink-2">No return is on file for this period.</p>
          ) : (
            <>
              <dl className="grid grid-cols-[1fr_auto] gap-y-2.5">
                <dt className="text-ink-2">Declared net payable</dt>
                <dd className="text-right font-mono">{rupees(data.declared.net_paise)}</dd>
                <dt className="text-ink-2">LedgerLens net payable</dt>
                <dd className="text-right font-mono">{rupees(net)}</dd>
                <dt className="border-t border-line pt-2.5 font-semibold">Gap</dt>
                <dd className={`border-t border-line pt-2.5 text-right font-mono text-[18px] font-semibold ${(data.gap_paise ?? 0) > 0 ? "text-bad" : "text-ok"}`}>
                  {rupees(data.gap_paise ?? 0)}
                </dd>
              </dl>
              <p className="mt-3 text-[13px] text-ink-2">
                {(data.gap_paise ?? 0) > 0
                  ? "The return paid less than the records support. Most of the gap is credit claimed on invoices that are at risk."
                  : "The return paid at least what the records support."}
              </p>
              <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-1.5 border-t border-line-2 pt-3 text-[13px]">
                <dt className="text-ink-3">Declared output tax</dt>
                <dd className="text-right font-mono">{rupees(data.declared.output_paise)}</dd>
                <dt className="text-ink-3">Declared ITC</dt>
                <dd className="text-right font-mono">{rupees(data.declared.itc_paise)}</dd>
                <dt className="text-ink-3">Due on</dt>
                <dd className="text-right">{date(data.declared.due_on)}</dd>
                <dt className="text-ink-3">Filed on</dt>
                <dd className={`text-right ${late ? "font-semibold text-bad" : ""}`}>
                  {date(data.declared.filed_on)}
                  {late ? " (late)" : ""}
                </dd>
              </dl>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
