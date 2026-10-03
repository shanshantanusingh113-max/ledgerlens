"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { api } from "@/lib/api";
import { useRun } from "@/lib/run-store";
import { fieldValue, percent, rupees, TABLE_NAMES } from "@/lib/format";
import type { Category, FindingRow, MatchDetail, MatchRow, RecordView } from "@/lib/types";
import { FindingDrawer } from "@/components/FindingDrawer";
import { FindingTable } from "@/components/FindingTable";
import { BandBadge, CATEGORY_NAME, EmptyState, ErrorState, PageTitle, Skeleton } from "@/components/ui";

const CATEGORIES: (Category | "")[] = ["", "tax", "missing", "duplicate", "matching", "anomaly", "filing"];
const KINDS = [
  { id: "", label: "All" },
  { id: "booking", label: "Invoice to ledger" },
  { id: "payment", label: "Invoice to bank" },
  { id: "supplier_filing", label: "Invoice to GSTR-2B" },
];
const BANDS = [
  { id: "", label: "All" },
  { id: "auto", label: "Auto-matched" },
  { id: "review", label: "Review" },
  { id: "unmatched", label: "Unmatched" },
];
const KIND_NAME: Record<string, string> = { booking: "Ledger", payment: "Bank", supplier_filing: "GSTR-2B" };
const AMOUNT_FIELD: Record<string, string> = { ledger_entries: "total_amount_paise", bank_transactions: "amount_paise", gstr2b_lines: "invoice_value_paise", invoices: "invoice_total_paise" };
const DATE_FIELD: Record<string, string> = { ledger_entries: "posting_date", bank_transactions: "txn_date", gstr2b_lines: "invoice_date", invoices: "invoice_date" };

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`border-b-2 px-0.5 pb-1 text-[15px] font-semibold ${active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
    >
      {children}
    </button>
  );
}

function Side({ title, records }: { title: string; records: RecordView[] }) {
  const total = records.reduce((sum, r) => sum + Math.abs(Number(r.fields[AMOUNT_FIELD[r.table]] ?? 0)), 0);
  return (
    <div className="border-t-2 border-ink">
      <p className="border-b border-line px-3 py-2 text-[13px] font-semibold text-ink-3">{title}</p>
      {records.length === 0 ? (
        <p className="px-3 py-4 text-[13px] text-ink-3">Nothing matched on this side.</p>
      ) : (
        <ul>
          {records.map((r) => (
            <li key={r.id} className="flex items-baseline justify-between gap-3 border-b border-line-2 px-3 py-2 text-[13px]">
              <span>
                <span className="font-mono font-semibold">{r.id}</span>
                <span className="ml-2 text-ink-3">{fieldValue(DATE_FIELD[r.table], r.fields[DATE_FIELD[r.table]])}</span>
              </span>
              <span className="font-mono">{fieldValue(AMOUNT_FIELD[r.table], r.fields[AMOUNT_FIELD[r.table]])}</span>
            </li>
          ))}
          <li className="flex justify-between px-3 py-2 text-[13px] font-semibold">
            <span>Total</span>
            <span className="font-mono">{rupees(total, true)}</span>
          </li>
        </ul>
      )}
    </div>
  );
}

function MatchPanel({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setDetail(null);
    setError(null);
    api.match(matchId).then(setDetail).catch((e: Error) => setError(e.message));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [matchId, onClose]);
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Match detail" className="drawer h-full w-full max-w-[640px] overflow-y-auto bg-paper p-5 shadow-float" onClick={(e) => e.stopPropagation()}>
        {error ? (
          <ErrorState message={error} />
        ) : !detail ? (
          <div className="grid gap-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="flex items-center gap-2">
              <BandBadge band={detail.match.band} layer={detail.match.layer} />
              <span className="text-[13px] text-ink-2">{percent(detail.match.confidence)} sure</span>
              <button className="btn ml-auto px-2 py-1.5" onClick={onClose} aria-label="Close" autoFocus>
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <h2 className="font-display text-[22px] font-bold leading-snug">
              {detail.match.layer === "one_to_many"
                ? detail.right.length > 1
                  ? `${detail.right.length} payments settle 1 invoice`
                  : `1 payment settles ${detail.left_all.length} invoices`
                : `${detail.match.invoice_id} and its ${KIND_NAME[detail.match.kind].toLowerCase()} record`}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Side title={detail.left_all.length > 1 ? "Invoices" : "Invoice"} records={detail.left_all} />
              <Side title={TABLE_NAMES[detail.right[0]?.table] ?? KIND_NAME[detail.match.kind]} records={detail.right} />
            </div>
            <div className="rounded-surface bg-inset p-5">
              <p className="mb-1 font-semibold text-orange-deep">Why these belong together</p>
              <ul className="list-disc pl-5">
                {detail.match.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {detail.match.layer === "one_to_many" && <p className="mt-2 text-[13px] text-ink-2">Matched, not flagged: a payment split across invoices is normal and raises no Finding.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkbenchPage() {
  const { runId, summary } = useRun();
  const [tab, setTab] = useState<"findings" | "matches">("findings");
  const [category, setCategory] = useState<Category | "">("");
  const [status, setStatus] = useState("open");
  const [kind, setKind] = useState("");
  const [band, setBand] = useState("");
  const [oneToMany, setOneToMany] = useState(false);
  const [findings, setFindings] = useState<{ items: FindingRow[]; total: number } | null>(null);
  const [matches, setMatches] = useState<{ items: MatchRow[]; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFinding, setOpenFinding] = useState<string | null>(null);
  const [openMatch, setOpenMatch] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!runId) return;
    setError(null);
    if (tab === "findings") {
      setFindings(null);
      api.findings(runId, { category, status, page_size: 300 }).then(setFindings).catch((e: Error) => setError(e.message));
    } else {
      setMatches(null);
      api
        .matches(runId, { kind, band: oneToMany ? "" : band, layer: oneToMany ? "one_to_many" : "", page_size: 200 })
        .then(setMatches)
        .catch((e: Error) => setError(e.message));
    }
  }, [runId, tab, category, status, kind, band, oneToMany]);

  // A link can open the One-to-many view directly.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "one-to-many") {
      setTab("matches");
      setKind("payment");
      setOneToMany(true);
    }
  }, []);

  // Reload when a Finding is approved or dismissed, which changes the summary.
  useEffect(load, [load, summary?.finding_counts_by_status?.open]);

  return (
    <div>
      <PageTitle
        title="Workbench"
        lead="Every Finding and every Match for the period. Open a row to see the records side by side, the reason and the drafted fix."
        right={
          <div className="flex rounded-control border border-line bg-paper p-0.5" role="tablist">
            {(["findings", "matches"] as const).map((t) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-bar px-4 py-1.5 font-semibold ${tab === t ? "bg-ink text-app-bg" : "text-ink-2"}`}>
                {t === "findings" ? "Findings" : "Matches"}
              </button>
            ))}
          </div>
        }
      />

      <div className="card p-4">
        {tab === "findings" ? (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c || "all"} active={category === c} onClick={() => setCategory(c)}>
                {c ? CATEGORY_NAME[c] : "All"}
                {c && summary?.finding_counts_by_category[c] !== undefined && status === "open" ? ` ${summary.finding_counts_by_category[c]}` : ""}
              </Chip>
            ))}
            <label className="ml-auto flex items-center gap-2 text-[13px] text-ink-2">
              Status
              <select className="rounded-control border border-line bg-paper px-2.5 py-1.5" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="open">Open</option>
                <option value="approved">Approved</option>
                <option value="dismissed">Dismissed</option>
                <option value="">All</option>
              </select>
            </label>
          </div>
        ) : (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {KINDS.map((k) => (
              <Chip key={k.id || "all"} active={kind === k.id} onClick={() => setKind(k.id)}>
                {k.label}
              </Chip>
            ))}
            <span className="mx-1 h-5 w-px bg-line" aria-hidden />
            {BANDS.map((b) => (
              <Chip key={b.id || "all"} active={!oneToMany && band === b.id} onClick={() => (setOneToMany(false), setBand(b.id))}>
                {b.label}
              </Chip>
            ))}
            <Chip active={oneToMany} onClick={() => (setOneToMany(true), setKind("payment"))}>
              One-to-many
            </Chip>
          </div>
        )}

        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : tab === "findings" ? (
          !findings ? (
            <Skeleton className="h-72" />
          ) : findings.items.length === 0 ? (
            <EmptyState title="No Findings match these filters" hint="Try another category or status." />
          ) : (
            <>
              <p className="mb-1 text-[13px] text-ink-3">{findings.total} Findings, ranked by rupees</p>
              <FindingTable rows={findings.items} onOpen={setOpenFinding} showStatus />
            </>
          )
        ) : !matches ? (
          <Skeleton className="h-72" />
        ) : matches.items.length === 0 ? (
          <EmptyState title="No Matches for these filters" />
        ) : (
          <>
            <p className="mb-1 text-[13px] text-ink-3">
              {matches.total.toLocaleString("en-IN")} Matches{matches.total > matches.items.length ? `, showing the ${matches.items.length} that need the most attention` : ""}
            </p>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-ink-3">
                  <th className="px-3 py-2 font-semibold">Invoice</th>
                  <th className="px-3 py-2 font-semibold">Matched with</th>
                  <th className="px-3 py-2 font-semibold">Band</th>
                  <th className="px-3 py-2 text-right font-semibold">How sure</th>
                  <th className="px-3 py-2 font-semibold">Why</th>
                </tr>
              </thead>
              <tbody>
                {matches.items.map((m) => (
                  <tr
                    key={m.id}
                    tabIndex={0}
                    role="button"
                    onClick={() => setOpenMatch(m.id)}
                    onKeyDown={(e) => e.key === "Enter" && setOpenMatch(m.id)}
                    className="cursor-pointer border-b border-line-2 hover:bg-cream-2"
                  >
                    <td className="px-3 py-2.5 font-mono">{m.invoice_ids.join(", ")}</td>
                    <td className="px-3 py-2.5 font-mono">
                      <span className="mr-2 font-sans text-ink-3">{KIND_NAME[m.kind]}</span>
                      {m.right_ids.join(", ") || <span className="font-sans text-ink-3">nothing</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <BandBadge band={m.band} layer={m.layer} />
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{percent(m.confidence)}</td>
                    <td className="max-w-[420px] truncate px-3 py-2.5 text-ink-2">{m.reasons[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <FindingDrawer findingId={openFinding} onClose={() => setOpenFinding(null)} />
      {openMatch && <MatchPanel matchId={openMatch} onClose={() => setOpenMatch(null)} />}
    </div>
  );
}
