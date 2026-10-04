"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Calculator, FileSpreadsheet, IndianRupee, Rows3, ScrollText, Target, Waypoints, Zap } from "lucide-react";
import { useRun } from "@/lib/run-store";
import { periodName } from "@/lib/format";
import { ErrorState, Skeleton } from "./ui";
import { RunLog, RunOverlay } from "./RunOverlay";
import { DemoGuide } from "./DemoGuide";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: IndianRupee },
  { href: "/workbench", label: "Workbench", icon: Rows3 },
  { href: "/graph", label: "Ring view", icon: Waypoints },
];
const REST = [
  { href: "/liability", label: "Liability", icon: Calculator },
  { href: "/proof", label: "Proof", icon: Target },
  { href: "/data", label: "Data", icon: FileSpreadsheet },
];
const RUN_TEXT: Record<string, string> = { loading: "Starting", running: "Running", done: "Run complete", failed: "Run failed", idle: "No run yet" };

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const run = useRun();
  const busy = run.runState === "loading" || run.runState === "running";
  const [logOpen, setLogOpen] = useState(false);
  const closeLog = useCallback(() => setLogOpen(false), []);

  useEffect(() => {
    if (run.ready && !run.loadError && !run.runId && !busy) router.replace("/");
  }, [run.ready, run.loadError, run.runId, busy, router]);

  const item = ({ href, label, icon: Icon }: (typeof NAV)[number]) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={`group relative flex items-center gap-3 py-2.5 pl-4 pr-3 text-[15px] font-semibold transition-colors ${
          active ? "text-white" : "text-white/50 hover:bg-white/[0.06] hover:text-white"
        }`}
      >
        <span className={`absolute inset-y-1 left-0 w-[2px] transition-colors ${active ? "bg-orange" : "bg-transparent group-hover:bg-white/25"}`} aria-hidden />
        <Icon className={`size-[17px] shrink-0 transition-colors ${active ? "text-orange" : "text-white/40 group-hover:text-white/70"}`} strokeWidth={1.75} aria-hidden />
        {label}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen">
      <nav aria-label="Main" className="sticky top-0 flex h-screen w-[188px] shrink-0 flex-col border-r border-white/[0.07] bg-side">
        <Link href="/" className="flex h-[61px] items-center gap-2 border-b border-white/[0.07] px-5">
          <span className="font-display text-[21px] font-extrabold leading-none text-white">LedgerLens</span>
        </Link>
        <div className="mt-5 grid gap-0.5">
          <p className="micro px-4 pb-2 text-white/35">Reconcile</p>
          {NAV.map(item)}
        </div>
        <div className="mt-6 grid gap-0.5">
          <p className="micro px-4 pb-2 text-white/35">Evidence</p>
          {REST.map(item)}
        </div>
        <div className="mt-auto border-t border-white/[0.07] px-4 py-3.5">
          <p className="flex items-center gap-2 text-[12.5px] text-white/50">
            <span className={`size-1.5 rounded-full ${busy ? "animate-pulse bg-orange" : run.runState === "failed" ? "bg-bad" : "bg-ok"}`} aria-hidden />
            {RUN_TEXT[run.runState]}
          </p>
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <header className="glass sticky top-0 z-30 flex h-[61px] items-center justify-between gap-6 border-b border-line px-6">
          <div className="min-w-0">
            <p className="truncate font-display text-[19px] font-bold leading-tight">{run.dataset?.company.name ?? "LedgerLens"}</p>
            <p className="num truncate text-[12px] text-ink-3">
              {run.dataset?.company.gstin}
              {run.summary && ` · ${periodName(run.summary.period)} · ${run.summary.invoice_count.toLocaleString("en-IN")} invoices`}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <label className="flex items-center gap-2 text-[13px] text-ink-2">
              Return period
              <select
                className="num rounded-control border border-line bg-paper px-2.5 py-1.5 text-[13px]"
                value={run.target}
                disabled={busy || !run.dataset}
                onChange={(e) => run.choosePeriod(e.target.value)}
              >
                {(run.dataset?.periods ?? [run.period]).map((p) => (
                  <option key={p} value={p}>
                    {periodName(p)}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" disabled={busy || !run.runId} onClick={() => setLogOpen(true)}>
              <ScrollText className="size-4" aria-hidden />
              Run log
            </button>
            <button className="btn btn-primary" disabled={busy || !run.dataset} onClick={() => run.launch()}>
              <Zap className="size-4" aria-hidden />
              Run reconciliation
            </button>
          </div>
        </header>

        <main className={`mx-auto max-w-[1440px] p-6 ${process.env.NEXT_PUBLIC_DEMO === "1" ? "pb-24" : ""}`}>
          {!run.ready ? (
            <div className="grid gap-4">
              <Skeleton className="h-10 w-80" />
              <Skeleton className="h-28" />
              <Skeleton className="h-64" />
            </div>
          ) : run.loadError ? (
            <ErrorState message={run.loadError} onRetry={run.retry} />
          ) : (
            children
          )}
        </main>
      </div>

      {process.env.NEXT_PUBLIC_DEMO === "1" && run.runId && !busy && <DemoGuide />}

      <RunOverlay />
      {logOpen && run.runId && run.summary && !busy && <RunLog runId={run.runId} period={run.summary.period} onClose={closeLog} />}
    </div>
  );
}
