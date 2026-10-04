"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useRun } from "@/lib/run-store";
import { fieldValue, periodName, rupees } from "@/lib/format";
import type { DatasetOverview, PlantedType, RecordPage, RecordTable } from "@/lib/types";
import { EmptyState, ErrorState, Heading, PageTitle, Skeleton } from "@/components/ui";

const SHEETS: Record<string, [string, string]> = {
  invoices: ["Invoices", "Sales and purchase invoices and credit notes"],
  ledger: ["Ledger", "What was booked in the accounts"],
  bank: ["Bank statement", "What was actually paid and received"],
  gstr2b: ["GSTR-2B", "What suppliers reported. Generated, see below"],
  parties: ["Parties", "70 customers and 50 suppliers"],
  tax_rates: ["Tax rates", "The GST rate for each product code and date"],
  filings: ["Filed returns", "The monthly return as the company filed it"],
  links: ["True matches", "Which booking and payment belong to each invoice"],
  answer_key: ["Answer key", "The true tax figures for each month"],
};

const TABLES: { id: RecordTable; label: string; columns: [string, string][] }[] = [
  {
    id: "invoices",
    label: "Invoices",
    columns: [["id", "Invoice"], ["invoice_date", "Date"], ["kind", "Kind"], ["party_id", "Party"], ["category", "Category"], ["taxable_paise", "Taxable"], ["rate_pct", "Rate"], ["total_tax_paise", "Tax"], ["total_paise", "Total"]],
  },
  {
    id: "ledger_entries",
    label: "Ledger",
    columns: [["id", "Entry"], ["posting_date", "Posted"], ["voucher_type", "Voucher"], ["account", "Account"], ["invoice_ref", "Invoice ref"], ["total_paise", "Total"], ["narration", "Narration"]],
  },
  {
    id: "bank_transactions",
    label: "Bank statement",
    columns: [["id", "Line"], ["txn_date", "Date"], ["direction", "Direction"], ["amount_paise", "Amount"], ["counterparty_name", "Counterparty"], ["payment_mode", "Mode"], ["narration", "Narration"]],
  },
  {
    id: "gstr2b_lines",
    label: "GSTR-2B",
    columns: [["id", "Line"], ["trade_name", "Supplier"], ["supplier_gstin", "GSTIN"], ["invoice_number", "Invoice number"], ["invoice_date", "Date"], ["taxable_paise", "Taxable"], ["rate_pct", "Rate"], ["return_period", "Return period"]],
  },
];
const PAGE = 25;
const percent = (share: number) => `${Math.round(share * 100)} percent`;

function Planted({ rows }: { rows: PlantedType[] }) {
  return (
    <table className="data">
      <thead>
        <tr>
          <th>Kind</th>
          <th className="right">Planted</th>
          <th>Where from</th>
          <th>One real example</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((p) => (
          <tr key={`${p.issue_type}-${p.source}`} className="align-top">
            <td className="font-semibold">{p.label}</td>
            <td className="num right text-[17px] font-semibold">{p.count.toLocaleString("en-IN")}</td>
            <td className="whitespace-nowrap text-ink-2">{p.source === "workbook" ? "The workbook" : "Added with GSTR-2B"}</td>
            <td>
              <span className="num text-[13px]">{p.example.entity_id}</span>
              {p.example.expected && p.example.recorded && (
                <span className="text-ink-2">
                  {" "}
                  should be <span className="num text-[13px] text-ink">{p.example.expected}</span>, recorded as <span className="num text-[13px] text-ink">{p.example.recorded}</span>
                </span>
              )}
              {p.example.impact_paise > 0 && <span className="text-ink-2"> ({rupees(p.example.impact_paise)})</span>}
              {p.example.description && <span className="block text-[13px] text-ink-2">{p.example.description}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Browser() {
  const run = useRun();
  const [table, setTable] = useState<RecordTable>("invoices");
  const [period, setPeriod] = useState(run.period);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RecordPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const spec = TABLES.find((t) => t.id === table)!;

  useEffect(() => {
    let cancelled = false;
    const wait = setTimeout(() => {
      api
        .records(table, { period, q, page, page_size: PAGE })
        .then((result) => !cancelled && (setData(result), setError(null)))
        .catch((e: ApiError) => !cancelled && setError(e.message));
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(wait);
    };
  }, [table, period, q, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;
  return (
    <div>
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex gap-5" role="tablist">
          {TABLES.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={table === t.id}
              onClick={() => (setTable(t.id), setPage(1))}
              className={`border-b-2 pb-1 text-[16px] font-semibold ${table === t.id ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-[14px] text-ink-2">
          Period
          <select className="rounded-control border border-line bg-paper px-2.5 py-2 font-mono text-[13px] text-ink" value={period} onChange={(e) => (setPeriod(e.target.value), setPage(1))}>
            <option value="">Whole year</option>
            {(run.dataset?.periods ?? []).map((p) => (
              <option key={p} value={p}>
                {periodName(p)}
              </option>
            ))}
          </select>
        </label>
        <input
          type="search"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPage(1))}
          placeholder="Search an ID, a name or a narration"
          aria-label="Search the records"
          className="w-72 rounded-control border border-line bg-paper px-3 py-2 text-[14px] placeholder:text-ink-2"
        />
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorState message={error} />
        </div>
      ) : !data ? (
        <Skeleton className="mt-4 h-96" />
      ) : data.items.length === 0 ? (
        <EmptyState title="No records match" hint="Try another period, or clear the search." />
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="data text-[13.5px]">
            <thead>
              <tr>
                {spec.columns.map(([field, label]) => (
                  <th key={field} className={`first:pl-0 ${field.endsWith("_paise") || field === "rate_pct" ? "right" : ""}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <tr key={String(row.id)}>
                  {spec.columns.map(([field]) => (
                    <td
                      key={field}
                      className={`max-w-[360px] truncate first:pl-0 ${field.endsWith("_paise") || field === "rate_pct" ? "num right" : ""} ${
                        field === "id" || field.includes("gstin") || field === "invoice_ref" || field === "invoice_number" ? "num" : ""
                      }`}
                    >
                      {fieldValue(field, row[field])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center gap-4 text-[14px] text-ink-2">
          <span>
            {((page - 1) * PAGE + 1).toLocaleString("en-IN")} to {Math.min(page * PAGE, data.total).toLocaleString("en-IN")} of {data.total.toLocaleString("en-IN")}
          </span>
          <button className="btn ml-auto" onClick={() => setPage(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <button className="btn" onClick={() => setPage(page + 1)} disabled={page >= pages}>
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default function DataPage() {
  const [data, setData] = useState<DatasetOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.dataset().then(setData).catch((e: ApiError) => setError(e.message));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data)
    return (
      <div className="grid gap-8">
        <Skeleton className="h-24 w-[520px]" />
        <Skeleton className="h-72" />
        <Skeleton className="h-96" />
      </div>
    );

  const rows = Object.fromEntries(data.sheets.map((s) => [s.name, s.rows]));
  const errors = data.planted.filter((p) => !p.benign);
  const traps = data.planted.filter((p) => p.benign);
  const g = data.gstr2b;
  const steps: [string, string, string][] = [
    [
      "Each supplier gets a filing habit",
      `${g.behaviours.reliable} file on time, ${g.behaviours.late} file a month late and ${g.behaviours.non_filer} do not file. The supplier in the ring always files on time.`,
      `${g.counts.labels.PERIOD_SHIFT} late lines, ${g.counts.labels.MISSING_IN_2B} invoices never reported`,
    ],
    [
      "Suppliers write invoice numbers their own way",
      `On ${percent(g.rates.id_variant)} of lines VEN001-0001 becomes 1, VEN/001/0001 or INV-0001. This is not an error; the matcher must still find the invoice.`,
      `${g.counts.id_variants} lines`,
    ],
    [
      "Some suppliers report a different amount",
      `On ${percent(g.rates.value_mismatch)} of lines the taxable value is 2 to 15 percent off, and the tax with it.`,
      `${g.counts.value_mismatches} lines`,
    ],
    ["Some dates slip", `On ${percent(g.rates.date_shift)} of lines the date moves 1 to 10 days later, which can push the line into the next month.`, `${g.counts.date_shifts} lines`],
    [
      "Lines the books do not have",
      `Extra lines equal to ${percent(g.rates.extra_lines)} of purchase invoices are added. Each is credit the company could claim but has not.`,
      `${g.counts.extra_lines} lines`,
    ],
    [
      "Suppliers unpaid for over 180 days",
      "Every purchase invoice still unpaid and dated more than 180 days before 31 March 2026 is marked, because its credit is then at risk.",
      `${g.counts.labels.RULE_37_UNPAID_180} invoices`,
    ],
    [
      "Cancelled registrations",
      "The two non-filers with the most invoices get a GSTIN cancelled from the date of their middle invoice. Invoices on or after that date are marked.",
      `${g.counts.labels.CANCELLED_GSTIN} invoices`,
    ],
    ["A supplier ring", "One customer is given the PAN of the supplier behind the earliest round trip of money, so one owner sits on both sides.", "2 parties"],
  ];

  return (
    <div className="grid gap-14 pb-6">
      <div>
        <PageTitle
          title="The data"
          lead="Everything LedgerLens shows comes from one workbook and the GSTR-2B lines generated from it. This page says what is in it, what was planted and how to check any record yourself."
        />
        <div className="tiles grid-cols-4">
          {(["invoices", "ledger", "bank", "gstr2b"] as const).map((name) => (
            <div key={name} className="tile">
              <p className="tile-value">{rows[name]?.toLocaleString("en-IN")}</p>
              <p className="mt-2 text-[16px] font-semibold">{name === "gstr2b" ? "GSTR-2B lines" : name === "ledger" ? "ledger entries" : name === "bank" ? "bank lines" : "invoices"}</p>
              <p className="mt-1 text-[14px] text-ink-2">{SHEETS[name][1]}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-12 px-2">
        <section>
          <Heading note="one year">What is in the workbook</Heading>
          <table className="data mt-2 text-[15px]">
            <tbody>
              {data.sheets.map((s) => (
                <tr key={s.name}>
                  <td className="font-semibold">{SHEETS[s.name]?.[0] ?? s.name}</td>
                  <td className="num right">{s.rows.toLocaleString("en-IN")}</td>
                  <td className="text-[14px] text-ink-2">{SHEETS[s.name]?.[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <Heading>Why this data</Heading>
          <div className="mt-5 grid gap-5 text-[16px] leading-relaxed">
            <p>
              <span className="font-display text-[20px] font-bold">It is one made-up company.</span> One financial year, 1 April 2025 to 31 March 2026, of records for a trading company in
              Delhi. The workbook does not name it; LedgerLens calls it Sharma Traders Pvt Ltd. No real business or person is in it.
            </p>
            <p>
              <span className="font-display text-[20px] font-bold">It is synthetic so accuracy can be measured.</span> A catch rate needs a list of known mistakes to count against. This
              workbook carries one: {data.workbook_labels.toLocaleString("en-IN")} labels for every planted mistake and every record that only looks wrong, and the true booking and
              payment for each invoice.
            </p>
            <p>
              <span className="font-display text-[20px] font-bold">It has what a reconciliation needs.</span> Invoices, books and bank lines for the same purchases, a rate table that
              includes the change of 22 Sep 2025, and traps that punish a tool for raising false alarms. The one thing it lacks is what suppliers reported, so that part is generated.
            </p>
            <p className="text-[14px] text-ink-2">
              Synthetic data is cleaner than real books, so results on real books will differ. File fingerprint (SHA-256): <span className="break-all font-mono text-[12px]">{data.sha256}</span>
            </p>
          </div>
        </section>
      </div>

      <section className="px-2">
        <Heading note={`${errors.length} kinds`}>Mistakes planted for LedgerLens to catch</Heading>
        <Planted rows={errors} />
      </section>

      <section className="px-2">
        <Heading note="reporting one of these is a false alarm">Traps that must not be flagged</Heading>
        <Planted rows={traps} />
        <p className="mt-4 max-w-[90ch] text-[14px] text-ink-2">
          One clash, stated openly: the workbook marks purchase invoices left unpaid as fine. LedgerLens reports them once they pass 180 days, because the credit is then at risk, and
          scores that rule against its own labels.
        </p>
      </section>

      <section className="px-2">
        <Heading note={`same result every time, seed ${g.seed}`}>How GSTR-2B was generated</Heading>
        <p className="mt-5 max-w-[80ch] text-[16px] leading-relaxed">
          The workbook has no record of what suppliers reported to the GST portal. LedgerLens needs it, so {g.counts.gstr2b_lines.toLocaleString("en-IN")} lines are generated from the{" "}
          {g.counts.purchase_invoices.toLocaleString("en-IN")} purchase invoices, changed the way real suppliers change them. An invoice the workbook marks as a duplicate gets no line,
          because the supplier issued it only once.
        </p>
        <ol className="mt-6">
          {steps.map(([title, text, count], i) => (
            <li key={title} className="grid grid-cols-[36px_280px_1fr_220px] items-baseline gap-4 border-t border-line py-3.5">
              <span className="font-display text-[22px] font-bold text-orange-deep">{i + 1}</span>
              <span className="text-[16px] font-semibold">{title}</span>
              <span className="text-[15px] text-ink-2">{text}</span>
              <span className="text-right font-mono text-[13px]">{count}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-2">
        <Heading note="straight from the loaded tables">Browse the records</Heading>
        <Browser />
      </section>
    </div>
  );
}
