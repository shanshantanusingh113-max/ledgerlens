"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ShieldAlert, X } from "lucide-react";
import { api } from "@/lib/api";
import { useRun } from "@/lib/run-store";
import { date, IMPACT_WORDS, periodName, rupees, rupeesShort } from "@/lib/format";
import type { Graph, GraphNode, PartyView } from "@/lib/types";
import { FindingDrawer } from "@/components/FindingDrawer";
import { RingStory } from "@/components/RingStory";
import { ErrorState, PageTitle, Skeleton } from "@/components/ui";

const COLOURS = { company: "#F28C3A", ring: "#D64545", cancelled: "#C98A12", clean: "#5B9079" };
const FEW = 18;
type Side = "all" | "supplier" | "customer";
const SIDES: { id: Side; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "supplier", label: "Suppliers" },
  { id: "customer", label: "Customers" },
];

function PartyPanel({ view, period, onClose, onOpenFinding }: { view: PartyView | null; period: string; onClose: () => void; onOpenFinding: (id: string) => void }) {
  if (!view) return <Skeleton className="h-64 opacity-20" />;
  const { party, invoices, payments, findings } = view;
  const invoiced = invoices.reduce((sum, i) => sum + i.total_paise, 0);
  return (
    <div className="rounded-surface border border-white/15 bg-slate-panel p-4 text-cream">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[20px] font-bold leading-tight">{party.name}</p>
          <p className="mt-0.5 text-[13px] text-cream/60">
            Your {party.kind}, {party.state}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close Party detail" className="rounded-control p-1.5 hover:bg-white/10">
          <X className="size-4" aria-hidden />
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
        <dt className="text-cream/60">GSTIN</dt>
        <dd className="font-mono">
          {party.gstin}
          {party.gstin_status === "cancelled" && <span className="ml-2 font-sans font-semibold text-[#F2B85A]">cancelled from {date(party.cancelled_from)}</span>}
        </dd>
        <dt className="text-cream/60">PAN</dt>
        <dd className="font-mono">{party.pan}</dd>
        {party.bank_account && (
          <>
            <dt className="text-cream/60">Bank account</dt>
            <dd className="font-mono">{party.bank_account}</dd>
          </>
        )}
      </dl>

      <p className="mt-4 text-[14px] font-semibold">
        {findings.length === 0 ? `No Findings in ${periodName(period)}` : `${findings.length} ${findings.length === 1 ? "Finding" : "Findings"} in ${periodName(period)}`}
      </p>
      <ul className="mt-1">
        {findings.slice(0, 6).map((f) => (
          <li key={f.id} className="border-t border-white/10">
            <button onClick={() => onOpenFinding(f.id)} className="group flex w-full items-baseline gap-3 py-2 text-left text-[13px]">
              <span className="flex-1">
                {f.label}
                {f.impact_type !== "none" && (
                  <span className="block font-mono text-orange">
                    {rupees(f.impact_paise)} <span className="font-sans text-cream/60">{IMPACT_WORDS[f.impact_type]}</span>
                  </span>
                )}
              </span>
              <ArrowRight className="size-4 shrink-0 text-orange transition-transform group-hover:translate-x-0.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {findings.length > 6 && <p className="text-[12px] text-cream/60">and {findings.length - 6} more in the workbench</p>}

      <p className="mt-4 text-[14px] font-semibold">
        {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}, {rupees(invoiced)}
      </p>
      <ul className="mt-1 text-[13px]">
        {invoices.slice(0, 6).map((i) => (
          <li key={i.id} className="flex justify-between gap-3 border-t border-white/10 py-1.5">
            <span className="font-mono">{i.id}</span>
            <span className="text-cream/60">{date(i.date)}</span>
            <span className="font-mono">{rupees(i.total_paise)}</span>
          </li>
        ))}
      </ul>
      {invoices.length > 6 && <p className="text-[12px] text-cream/60">and {invoices.length - 6} more</p>}

      <p className="mt-4 text-[14px] font-semibold">
        {payments.length} bank {payments.length === 1 ? "line" : "lines"}
      </p>
      <ul className="mt-1 text-[13px]">
        {payments.slice(0, 6).map((p) => (
          <li key={p.id} className="flex justify-between gap-3 border-t border-white/10 py-1.5">
            <span className="font-mono">{p.id}</span>
            <span className="text-cream/60">
              {date(p.date)}, {p.direction === "debit" ? "paid out" : "received"}
            </span>
            <span className="font-mono">{rupees(p.amount_paise)}</span>
          </li>
        ))}
      </ul>
      {payments.length > 6 && <p className="text-[12px] text-cream/60">and {payments.length - 6} more</p>}
    </div>
  );
}

export default function GraphPage() {
  const { runId, summary } = useRun();
  const [graph, setGraph] = useState<Graph | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [side, setSide] = useState<Side>("all");
  const [everyone, setEveryone] = useState(false);
  const [search, setSearch] = useState("");
  const [partyId, setPartyId] = useState<string | null>(null);
  const [party, setParty] = useState<PartyView | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const [cy, setCy] = useState<import("cytoscape").Core | null>(null);
  // The first linked group is picked for the panel on load, but the ring only dims once a reader asks for it.
  const [picked, setPicked] = useState(false);

  useEffect(() => {
    if (!runId) return;
    setError(null);
    setGraph(null);
    setPartyId(null);
    api
      .graph(runId)
      .then((g) => {
        setGraph(g);
        setSelected(g.rings[0]?.id ?? null);
      })
      .catch((e: Error) => setError(e.message));
  }, [runId]);

  useEffect(() => {
    if (!runId || !partyId) return;
    let cancelled = false;
    setParty(null);
    api
      .party(runId, partyId)
      .then((view) => !cancelled && setParty(view))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [runId, partyId, summary]);

  const wanted = search.trim().toLowerCase();
  const onSide = (n: GraphNode) => n.kind !== "company" && (side === "all" || n.kind === side);
  const pool = graph?.nodes.filter((n) => onSide(n) && n.risk === "clean" && (wanted ? n.label.toLowerCase().includes(wanted) : everyone || n.invoice_count > 0)) ?? [];
  const plain = wanted || everyone ? pool : pool.slice(0, FEW);
  const plainKey = plain.map((n) => n.id).join(",");

  useEffect(() => {
    if (!graph || !canvas.current) return;
    let cy: import("cytoscape").Core | undefined;
    let cancelled = false;
    import("cytoscape").then(({ default: cytoscape }) => {
      if (cancelled || !canvas.current) return;
      const names = new Map(graph.nodes.map((n) => [n.id, n]));
      // The Company sits in the middle, the Parties stand round it, and linked Parties stand on a closer ring.
      const risky = graph.nodes.filter((n) => n.kind !== "company" && n.risk !== "clean" && (side === "all" || n.kind === side));
      const shown = new Set(["company", ...risky.map((n) => n.id), ...plain.map((n) => n.id)]);
      const position = new Map<string, { x: number; y: number }>([["company", { x: 0, y: 0 }]]);
      const onRing = (count: number, i: number, radius: number) => {
        const angle = (Math.PI * 2 * i) / Math.max(1, count) - Math.PI / 2;
        return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
      };
      // Past a certain count one circle turns into a knot, so the ring is drawn in bands.
      const bands = Math.max(1, Math.ceil(plain.length / 60));
      plain.forEach((n, i) => {
        const band = Math.floor(i / Math.ceil(plain.length / bands));
        const inBand = Math.ceil(plain.length / bands);
        position.set(n.id, onRing(inBand, i % inBand, 400 + band * 96));
      });
      risky.forEach((n, i) => position.set(n.id, onRing(risky.length, i, 250)));
      const named = plain.length <= 8;
      cy = cytoscape({
        container: canvas.current,
        elements: [
          ...graph.nodes.filter((n) => shown.has(n.id)).map((n) => ({
            position: position.get(n.id),
            data: {
              id: n.id,
              label:
                n.kind === "company"
                  ? "You"
                  : n.risk === "clean"
                    ? named
                      ? n.label
                      : ""
                    : `${n.label}\n${n.risk === "cancelled" ? "GSTIN cancelled" : n.kind === "supplier" ? "your supplier" : "your customer"}`,
              colour: n.kind === "company" ? COLOURS.company : COLOURS[n.risk],
              size: n.kind === "company" ? 88 : n.risk === "clean" ? (plain.length > 40 ? 16 : 24) : 58,
              level: n.kind === "company" ? 3 : n.risk === "clean" ? 1 : 2,
              quiet: n.kind !== "company" && n.invoice_count === 0,
            },
          })),
          ...graph.edges
            .filter((e) => shown.has(e.source) && shown.has(e.target) && (e.kind !== "trade" || (names.get(e.target)?.invoice_count ?? 0) > 0))
            .map((e, i) => ({
              data: {
                id: `e${i}`,
                source: e.source,
                target: e.target,
                kind: e.kind,
                label: e.kind === "trade" ? "" : e.label.replace(/ [A-Z0-9]{10}$/, ""),
                risky: e.kind !== "trade" || names.get(e.target)?.risk !== "clean",
              },
            })),
        ],
        layout: { name: "preset", padding: 70 },
        style: [
          {
            selector: "node",
            style: {
              "background-color": "data(colour)",
              width: "data(size)",
              height: "data(size)",
              label: "data(label)",
              color: "#FFF7EC",
              "font-family": "Inter, system-ui, sans-serif",
              "font-size": 15,
              "font-weight": 600,
              "text-wrap": "wrap",
              "text-valign": "bottom",
              "text-margin-y": 8,
              "line-height": 1.35,
              "border-width": 3,
              "border-color": "rgba(255,255,255,0.35)",
            },
          },
          { selector: "node[level = 3]", style: { "text-valign": "center", "text-margin-y": 0, color: "#24110C", "font-size": 20, "font-weight": 700 } },
          { selector: "node[level = 1]", style: { "border-width": 0, opacity: 0.9, "font-size": 12, "font-weight": 500 } },
          { selector: "node[?quiet]", style: { opacity: 0.35 } },
          { selector: "node:selected", style: { "border-width": 4, "border-color": "#FFFFFF", opacity: 1 } },
          { selector: "edge", style: { width: 1.2, "line-color": "rgba(255,239,216,0.22)", "curve-style": "bezier" } },
          { selector: "edge[kind = 'trade']", style: { "target-arrow-shape": "triangle", "arrow-scale": 0.8, "target-arrow-color": "rgba(255,239,216,0.4)" } },
          { selector: "edge[?risky][kind = 'trade']", style: { width: 3, "line-color": COLOURS.company, "target-arrow-color": COLOURS.company } },
          { selector: "node.lit", style: { "border-width": 4, "border-color": "#FFF7EC", opacity: 1 } },
          { selector: "node.dim", style: { opacity: 0.22 } },
          { selector: "edge.lit", style: { width: 2.6, opacity: 1 } },
          { selector: "edge.dim", style: { opacity: 0.12 } },
          {
            selector: "edge[kind != 'trade']",
            style: {
              width: 3,
              "line-color": "#F26D6D",
              "line-style": "dashed",
              label: "data(label)",
              color: "#FF9A9A",
              "font-size": 13,
              "font-weight": 600,
              "text-background-color": "#211815",
              "text-background-opacity": 1,
              "text-background-padding": "4px",
              "curve-style": "unbundled-bezier",
              "control-point-distances": [90],
              "control-point-weights": [0.5],
            },
          },
        ],
        userZoomingEnabled: false,
        boxSelectionEnabled: false,
      });
      cy.on("tap", "node", (event) => {
        const id = event.target.id();
        if (id === "company") return;
        const ring = graph.rings.find((r) => r.members.includes(id));
        if (ring) {
          setPicked(true);
          setSelected(ring.id);
        }
        setPartyId(id);
      });
      setCy(cy);
    });
    return () => {
      cancelled = true;
      setCy(null);
      cy?.destroy();
    };
    // plainKey stands for the list of ordinary Parties drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph, side, plainKey]);

  // Picking a linked group lights its Parties and links and lets the rest of the ring go quiet.
  useEffect(() => {
    if (!cy || !graph) return;
    cy.elements().removeClass("lit dim");
    if (!picked) return;
    const ring = graph.rings.find((r) => r.id === selected);
    if (!ring || ring.members.length === 0) return;
    const members = cy.$(ring.members.join(", "));
    members.addClass("lit");
    members.connectedEdges().addClass("lit");
    cy.nodes().not(members).addClass("dim");
    cy.edges().not(members.connectedEdges()).addClass("dim");
  }, [selected, graph, cy, picked]);

  if (error) return <ErrorState message={error} />;

  const period = summary?.period ?? "";
  const ring = graph?.rings.find((r) => r.id === selected) ?? null;
  const names = new Map(graph?.nodes.map((n) => [n.id, n.label]) ?? []);
  const parties = graph ? graph.nodes.length - 1 : 0;
  const trading = graph?.nodes.filter((n) => n.invoice_count > 0).length ?? 0;

  return (
    <div className="grid gap-14 pb-6">
      <div>
        <PageTitle
          title="Ring view"
          lead="Who you trade with, and which of them are linked. A Supplier and a Customer with the same PAN have one owner, so money and credit can move in a circle. Click any Party to see its month."
        />

        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 px-2">
          <div className="flex rounded-control border border-line bg-paper p-0.5" role="tablist" aria-label="Which Parties to show">
            {SIDES.map((s) => (
              <button key={s.id} role="tab" aria-selected={side === s.id} onClick={() => setSide(s.id)} className={`rounded-bar px-4 py-1.5 font-semibold ${side === s.id ? "bg-ink text-app-bg" : "text-ink-2"}`}>
                {s.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[15px]">
            <input type="checkbox" className="size-4 accent-[var(--orange-deep)]" checked={everyone} onChange={(e) => setEveryone(e.target.checked)} />
            All {parties} Parties, not only the {FEW} largest
          </label>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find a Party by name"
            aria-label="Find a Party by name"
            className="ml-auto w-72 rounded-control border border-line bg-paper px-3 py-2 text-[14px] placeholder:text-ink-2"
          />
        </div>

        <div className="relative overflow-hidden rounded-surface bg-[#211815]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)", backgroundSize: "48px 48px" }}>
          {!graph ? (
            <Skeleton className="h-[640px] opacity-20" />
          ) : (
            <div ref={canvas} className="h-[640px] w-[calc(100%-390px)]" role="img" aria-label={`The Company at the centre of a ring of its Parties for ${period ? periodName(period) : "the period"}. ${graph.rings.length} linked groups.`} />
          )}

          {graph && (
            <aside className="absolute right-4 top-4 flex max-h-[608px] w-[360px] flex-col gap-3 overflow-y-auto">
              {partyId ? (
                <PartyPanel view={party} period={period} onClose={() => setPartyId(null)} onOpenFinding={setOpenId} />
              ) : graph.rings.length === 0 ? (
                <div className="rounded-surface border border-white/10 bg-slate-panel p-4 text-cream">No linked Parties in this period.</div>
              ) : (
                graph.rings.map((r) => {
                  const active = r.id === ring?.id;
                  const isRing = r.id.startsWith("ring");
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setPicked(true);
                        setSelected(r.id);
                      }}
                      aria-pressed={active}
                      className={`rounded-surface border p-4 text-left text-cream ${active ? "border-[#F26D6D]/70 bg-slate-panel" : "border-white/10 bg-slate-panel opacity-80 hover:opacity-100"}`}
                    >
                      <p className={`mb-1.5 flex items-center gap-2 font-display text-[18px] font-bold ${isRing ? "text-[#FF8A8A]" : "text-[#F2B85A]"}`}>
                        <ShieldAlert className="size-5" aria-hidden />
                        {isRing ? "Supplier and Customer, one owner" : "Cancelled GSTIN"}
                      </p>
                      <p className="text-[12px] text-cream/60">{r.members.map((m) => names.get(m) ?? m).join(" and ")}</p>
                      {active && <p className="mt-2 text-[14px] leading-relaxed">{r.reason}</p>}
                      <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-[13px] text-cream/70">
                        <dt>Credit at risk this month</dt>
                        <dd className="text-right font-mono font-semibold text-orange">{rupeesShort(r.itc_at_risk_paise)}</dd>
                        <dt>{isRing ? "Invoices with them" : "Invoices after cancellation"}</dt>
                        <dd className="text-right font-mono font-semibold text-white">{r.invoice_count}</dd>
                      </dl>
                    </button>
                  );
                })
              )}
            </aside>
          )}

          <ul className="absolute bottom-3 left-4 flex flex-wrap gap-4 text-[13px] text-cream/80">
            {[
              ["Your company", COLOURS.company],
              ["Linked by one PAN", COLOURS.ring],
              ["Cancelled GSTIN", COLOURS.cancelled],
              [`Other Parties (${plain.length} shown)`, COLOURS.clean],
            ].map(([label, colour]) => (
              <li key={label} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: colour }} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
        {graph && (
          <p className="mt-3 max-w-[110ch] px-2 text-[14px] text-ink-2">
            {trading} of {parties} Parties traded with you this month.{" "}
            Links are checked on PAN and on bank account.{" "}
            {graph.shared_accounts.length === 0 ? "No two Parties share a bank account in this data." : `${graph.shared_accounts.length} bank accounts are used by more than one Party.`} LedgerLens
            reports the link and what it puts at stake. It does not call anyone a fraud; a person decides what the link means.
          </p>
        )}
      </div>

      {graph?.stories.map((story) => (
        <RingStory key={story.ring_id} story={story} period={period} creditAtRisk={graph.rings.find((r) => r.id === story.ring_id)?.itc_at_risk_paise ?? 0} />
      ))}

      <FindingDrawer findingId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
