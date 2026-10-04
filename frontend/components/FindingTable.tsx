"use client";

import { ChevronRight } from "lucide-react";
import type { FindingRow } from "@/lib/types";
import { date, IMPACT_WORDS, percent, rupees } from "@/lib/format";
import { CATEGORY_TONE, Pill, StatusPill } from "./ui";

export function FindingTable({ rows, onOpen, showStatus = false }: { rows: FindingRow[]; onOpen: (id: string) => void; showStatus?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="data text-[14px]">
        <thead>
          <tr>
            <th>Record</th>
            <th>Party</th>
            <th>Finding</th>
            <th className="right">Rupee impact</th>
            <th className="right">How sure</th>
            <th>Deadline</th>
            {showStatus && <th>Status</th>}
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr
              key={f.id}
              tabIndex={0}
              role="button"
              aria-label={`Open Finding: ${f.title}`}
              onClick={() => onOpen(f.id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(f.id))}
              className="group cursor-pointer"
            >
              <td className="num text-[13px]">{f.record_refs[0]?.id}</td>
              <td className="max-w-[200px] truncate">{f.party?.name ?? "Company"}</td>
              <td>
                <Pill tone={CATEGORY_TONE[f.category]}>{f.label}</Pill>
              </td>
              <td className="num right">
                {f.impact_type === "none" ? (
                  <span className="text-ink-3">none</span>
                ) : (
                  <>
                    <span className="font-semibold">{rupees(f.impact_paise)}</span> <span className="text-[12.5px] text-ink-3">{IMPACT_WORDS[f.impact_type]}</span>
                  </>
                )}
              </td>
              <td className="num right">{percent(f.confidence)}</td>
              <td className="text-ink-2">{f.deadline ? date(f.deadline) : ""}</td>
              {showStatus && (
                <td>
                  <StatusPill status={f.status} />
                </td>
              )}
              <td className="right">
                <span className="inline-flex items-center gap-0.5 font-semibold text-ink-3 transition-colors group-hover:text-orange-deep">
                  See why and fix <ChevronRight className="size-4" aria-hidden />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}