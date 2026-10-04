"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, Mail, Pencil, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import { useRun } from "@/lib/run-store";
import { date, fieldValue, percent, TABLE_NAMES } from "@/lib/format";
import type { Draft, FindingDetail as Detail, RecordView } from "@/lib/types";
import { CATEGORY_TONE, ErrorState, ImpactPill, Pill, Skeleton, StatusPill } from "./ui";

const DRAFT_TITLES: Record<string, string> = {
  supplier_email: "email to the Supplier",
  customer_credit_note: "note to the Customer",
  credit_note_request: "credit note request to the Supplier",
  journal_entry: "correction for the books",
};
const SOURCE_NOTE: Record<Draft["source"], string> = {
  llm: "Worded by AI from the facts above",
  cache: "Worded by AI from the facts above",
  template: "Written from a template",
};

function RecordCard({ record, labels }: { record: RecordView; labels: Record<string, string> }) {
  return (
    <div className="rounded-surface border border-line p-3">
      <p className="mb-2 text-[12px] font-semibold text-ink-3">
        {TABLE_NAMES[record.table] ?? record.table} <span className="font-mono text-ink">{record.id}</span>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
        {Object.entries(record.fields)
          .filter(([, v]) => v !== null && v !== "")
          .map(([field, v]) => (
            <div key={field} className="contents">
              <dt className="text-ink-3">{labels[field] ?? field}</dt>
              <dd className={`text-right ${typeof v === "number" || /_paise$|gstin|utr|invoice_ref|invoice_number/.test(field) ? "font-mono" : ""} break-words`}>{fieldValue(field, v)}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

export function FindingBody({ findingId, onClose }: { findingId: string; onClose?: () => void }) {
  const run = useRun();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const [dismissing, setDismissing] = useState(false);
  const [note, setNote] = useState("");
  const [working, setWorking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setDraftError(null);
    try {
      const found = await api.finding(findingId);
      setDetail(found);
      api
        .draft(findingId)
        .then((d) => {
          setDraft(d);
          setText(d.body);
        })
        .catch((e: Error) => setDraftError(e.message));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [findingId]);

  useEffect(() => {
    setDetail(null);
    setDraft(null);
    setEditing(false);
    setDismissing(false);
    setToast(null);
    load();
  }, [load]);

  async function act(action: () => Promise<{ summary: import("@/lib/types").Summary }>, done: string) {
    setWorking(true);
    setError(null);
    try {
      const result = await action();
      run.setSummary(result.summary);
      setToast(done);
      setDismissing(false);
      setDetail(await api.finding(findingId));
      setDraft(await api.draft(findingId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }

  if (error && !detail) return <ErrorState message={error} onRetry={load} />;
  if (!detail)
    return (
      <div className="grid gap-3">
        <Skeleton className="h-7 w-72" />
        <Skeleton className="h-36" />
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
      </div>
    );

  const { left, right, expected } = detail.evidence;
  const leftName = TABLE_NAMES[left.table] ?? left.table;
  const rightName = right ? (TABLE_NAMES[right.table] ?? right.table) : null;
  const showRight = detail.diff.some((d) => d.right !== null);
  const showExpected = detail.diff.some((d) => d.expected !== null);
  const open = detail.status === "open";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Pill tone={CATEGORY_TONE[detail.category]}>{detail.label}</Pill>
          <ImpactPill finding={detail} />
          <Pill>{percent(detail.confidence)} sure</Pill>
          {!open && <StatusPill status={detail.status} />}
          {onClose && (
            <button className="btn ml-auto px-2 py-1.5" onClick={onClose} aria-label="Close" data-autofocus>
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <h2 className="font-display text-[22px] font-bold leading-snug">{detail.title}</h2>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {detail.party?.name ?? "Company level"} · <span className="font-mono">{left.id}</span>
          {typeof left.fields.invoice_date === "string" && ` · ${date(left.fields.invoice_date)}`}
          {detail.deadline && ` · deadline ${date(detail.deadline)}`}
        </p>
      </div>

      {toast && (
        <div role="status" className="flex items-center gap-2 rounded-surface bg-ok-soft px-3 py-2 font-semibold text-ok">
          <Check className="size-4" aria-hidden /> {toast}
        </div>
      )}
      {error && <ErrorState message={error} />}

      {detail.diff.length > 0 && (
        <div className="border-t-2 border-ink">
<table className="data text-[13.5px]">
            <thead>
              <tr>
                <th>Field</th>
                <th className="right">{leftName}</th>
                {showRight && <th className="right">{rightName}</th>}
                {showExpected && <th className="right">Should be</th>}
              </tr>
            </thead>
            <tbody>
              {detail.diff.map((d) => (
                <tr key={d.field}>
                  <td>{d.label}</td>
                  <td className={`num right ${d.differs ? "font-semibold text-bad" : ""}`}>{fieldValue(d.field, d.left)}</td>
                  {showRight && <td className={`num right ${d.differs && !showExpected ? "font-semibold text-ok" : ""}`}>{fieldValue(d.field, d.right)}</td>}
                  {showExpected && <td className="num right font-semibold text-ok">{fieldValue(d.field, d.expected)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {detail.rule_ref && (
            <p className="border-t border-line-2 px-3 py-2 text-[12px] text-ink-3">
              Rule: {detail.rule_ref}
              {typeof expected?.effective_from === "string" && `, in force from ${date(expected.effective_from)}`}
            </p>
          )}
        </div>
      )}

      <div className="rail rail-iris">
        <p className="mb-1 flex items-center gap-2 font-semibold text-orange-deep">
          <Sparkles className="size-4" aria-hidden /> Why this was flagged
        </p>
        <p>{detail.reason}</p>
        <p className="mt-1 text-[13px] text-ink-2">{detail.rule_text}</p>
        <p className="mt-3 font-semibold">What to do</p>
        <p>{detail.what_to_do}</p>
      </div>

      <div className="border-t-2 border-ink pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold">
            {draft?.kind === "journal_entry" ? <FileText className="size-4 text-miss" aria-hidden /> : <Mail className="size-4 text-miss" aria-hidden />}
            Drafted for you: {DRAFT_TITLES[draft?.kind ?? ""] ?? "next step"}
          </p>
          {draft && <span className="text-[12px] text-ink-3">{SOURCE_NOTE[draft.source]}</span>}
        </div>
        {draftError ? (
          <ErrorState message={draftError} onRetry={load} />
        ) : !draft ? (
          <div className="grid gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <>
            <p className="text-[13px] text-ink-3">
              To: {draft.recipient} · Subject: <span className="text-ink">{draft.subject}</span>
            </p>
            {editing ? (
              <textarea
                className="mt-2 h-48 w-full rounded-control border border-line p-3 text-[13px] leading-relaxed"
                value={text}
                onChange={(e) => setText(e.target.value)}
                aria-label="Draft text"
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap rounded-control bg-app-bg p-3 text-[13px] leading-relaxed">{draft.body}</p>
            )}

            {open ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {editing ? (
                  <>
                    <button
                      className="btn btn-primary"
                      disabled={working || !text.trim()}
                      onClick={async () => {
                        setWorking(true);
                        try {
                          setDraft(await api.editDraft(draft.id, text));
                          setEditing(false);
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setWorking(false);
                        }
                      }}
                    >
                      Save draft
                    </button>
                    <button className="btn" onClick={() => (setEditing(false), setText(draft.body))}>
                      Cancel
                    </button>
                  </>
                ) : dismissing ? (
                  <>
                    <input
                      className="min-w-0 flex-1 rounded-control border border-line px-3 py-2 text-[13px]"
                      placeholder="Why is this not a problem?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      aria-label="Reason for dismissing"
                      autoFocus
                    />
                    <button className="btn" disabled={working || !note.trim()} onClick={() => act(() => api.dismiss(detail.id, note), "Dismissed. Headline numbers updated.")}>
                      Dismiss
                    </button>
                    <button className="btn" onClick={() => setDismissing(false)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn btn-primary" disabled={working} onClick={() => act(() => api.approve(draft.id), "Approved. Headline numbers updated.")}>
                      <Check className="size-4" aria-hidden /> Approve draft
                    </button>
                    <button className="btn" onClick={() => setEditing(true)}>
                      <Pencil className="size-4" aria-hidden /> Edit draft
                    </button>
                    <button className="btn" onClick={() => setDismissing(true)}>
                      Dismiss with note
                    </button>
                  </>
                )}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-ink-2">
                This Finding is {detail.status}
                {detail.status_note ? `: ${detail.status_note}` : "."}
              </p>
            )}
            <p className="mt-2 text-[12px] text-ink-3">Approving records your decision. Nothing is sent from this prototype.</p>
          </>
        )}
      </div>

      <details className="border-t border-line pt-3" open={detail.diff.length === 0}>
        <summary className="cursor-pointer font-semibold">The records behind this Finding</summary>
        <div className={`mt-3 grid gap-3 ${right ? "sm:grid-cols-2" : ""}`}>
          <RecordCard record={left} labels={detail.field_labels} />
          {right && <RecordCard record={right} labels={detail.field_labels} />}
        </div>
      </details>
    </div>
  );
}

export function FindingDrawer({ findingId, onClose }: { findingId: string | null; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!findingId) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel.current) return;
      const items = panel.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], textarea, input, summary, [tabindex='0']");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) (event.preventDefault(), last.focus());
      else if (!event.shiftKey && document.activeElement === last) (event.preventDefault(), first.focus());
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [findingId, onClose]);

  if (!findingId) return null;
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Finding detail"
        className="drawer h-full w-full max-w-[640px] overflow-y-auto bg-paper p-5 shadow-float outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <FindingBody findingId={findingId} onClose={onClose} />
      </div>
    </div>
  );
}
