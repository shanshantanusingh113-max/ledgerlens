"use client";

import { useState } from "react";
import { Check, Mail, RotateCcw } from "lucide-react";
import { date, fieldValue, IMPACT_WORDS, percent, rupees } from "@/lib/format";
import type { FieldDiff, ImpactType } from "@/lib/types";
import { Pill } from "../ui";

export type DemoFinding = {
  title: string;
  label: string;
  impact_paise: number;
  impact_type: ImpactType;
  confidence: number;
  party: string | null;
  record: string | null;
  invoice_date: string | null;
  diff: FieldDiff[];
  rule_ref: string | null;
  reason: string;
  rule_text: string;
  what_to_do: string;
  draft: { recipient: string; subject: string; body: string };
};

function Moved({ label, before, after, approved }: { label: string; before: number; after: number; approved: boolean }) {
  return (
    <div>
      <dt className="text-[14px] text-ink-2">{label}</dt>
      <dd className="font-display text-[30px] font-bold leading-tight">
        {approved && <span className="mr-3 text-[20px] text-ink-3 line-through">{rupees(before)}</span>}
        <span className={approved ? "text-ok" : ""}>{rupees(approved ? after : before)}</span>
      </dd>
    </div>
  );
}

/** A real Finding from the demo month with its evidence and Draft. Approving it here changes only this page. */
export function FindingDemo({ finding, excessPaise, netPayablePaise }: { finding: DemoFinding; excessPaise: number; netPayablePaise: number }) {
  const [approved, setApproved] = useState(false);
  return (
    <div className="rounded-surface bg-paper p-7 shadow-float">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Pill tone="bad">{finding.label}</Pill>
        <Pill tone="bad">
          {rupees(finding.impact_paise)} {IMPACT_WORDS[finding.impact_type]}
        </Pill>
        <Pill>{percent(finding.confidence)} sure</Pill>
        {approved && <Pill tone="ok">Approved</Pill>}
      </div>
      <p className="font-display text-[22px] font-bold leading-snug">{finding.title}</p>
      <p className="mt-0.5 text-[13px] text-ink-2">
        {finding.party} · <span className="font-mono">{finding.record}</span> · {date(finding.invoice_date)}
      </p>

      <table className="mt-4 w-full border-collapse border-t-2 border-ink text-[14px]">
        <thead>
          <tr className="border-b border-line text-ink-2">
            <th className="px-3 py-2 text-left font-semibold">Field</th>
            <th className="px-3 py-2 text-right font-semibold">Invoice</th>
            <th className="px-3 py-2 text-right font-semibold">Should be</th>
          </tr>
        </thead>
        <tbody>
          {finding.diff.map((d) => (
            <tr key={d.field} className="border-b border-line-2">
              <td className="px-3 py-2">{d.label}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-bad">{fieldValue(d.field, d.left)}</td>
              <td className="px-3 py-2 text-right font-mono font-semibold text-ok">{fieldValue(d.field, d.expected)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-[12px] text-ink-2">Rule: {finding.rule_ref}</p>

      <div className="mt-2 rounded-surface bg-inset p-5">
        <p className="font-semibold text-orange-deep">Why this was flagged</p>
        <p className="mt-1 text-[15px] leading-relaxed">{finding.reason}</p>
        <p className="mt-2 font-semibold">What to do</p>
        <p className="text-[15px]">{finding.what_to_do}</p>
      </div>

      <div className="mt-5 border-t-2 border-ink pt-4">
        <p className="flex items-center gap-2 font-semibold">
          <Mail className="size-4 text-miss" aria-hidden /> Drafted for you: {finding.draft.subject}
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">To: {finding.draft.recipient}. Worded by AI from the facts above.</p>
        <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-control bg-app-bg p-3 text-[13px] leading-relaxed">{finding.draft.body}</p>
        <div className="mt-3 flex items-center gap-3">
          {approved ? (
            <>
              <p role="status" className="flex items-center gap-2 font-semibold text-ok">
                <Check className="size-4" aria-hidden /> Approved. The numbers below moved.
              </p>
              <button className="btn ml-auto" onClick={() => setApproved(false)}>
                <RotateCcw className="size-4" aria-hidden /> Undo
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => setApproved(true)}>
                <Check className="size-4" aria-hidden /> Approve draft
              </button>
              <span className="text-[13px] text-ink-2">Try it. Nothing is sent from this page.</span>
            </>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-6 border-t border-line pt-4">
        <Moved label="Tax charged in excess, September 2025" before={excessPaise} after={excessPaise - finding.impact_paise} approved={approved} />
        <Moved label="Net payable, September 2025" before={netPayablePaise} after={netPayablePaise - finding.impact_paise} approved={approved} />
      </dl>
    </div>
  );
}
