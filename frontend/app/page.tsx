"use client";

import { FindingDemo, type DemoFinding } from "@/components/landing/FindingDemo";
import { ProofDemo, type DemoProof } from "@/components/landing/ProofDemo";
import { RunDemo } from "@/components/landing/RunDemo";
import { CountUp } from "@/components/landing/CountUp";
import { Nav, ScrollProgress } from "@/components/landing/Nav";
import { ParticleField } from "@/components/landing/ParticleField";
import { Reveal } from "@/components/landing/Reveal";
import { CauseBar, MoneyStrip } from "@/components/MoneyStrip";
import { RingStory } from "@/components/RingStory";
import { StartActions } from "@/components/StartActions";
import { IMPACT_WORDS, indian, rupees } from "@/lib/format";
import type { FeedItem, ImpactType, RingStory as Story, StageEvent, Summary } from "@/lib/types";
// Real results for September 2025, written by scripts/landing-data.mjs. Nothing on this page is a picture.
import data from "@/lib/landing-data.json";

const WIDE = "mx-auto max-w-[1280px] px-10";
const EYEBROW = "label text-spark";
const SECTION = "py-28 lg:py-36";

const summary = data.summary as unknown as Summary;
const top = data.summary.top_findings as { label: string; impact_paise: number; impact_type: ImpactType; party: string | null; record: string | null }[];

const RECORDS: [number, string, string][] = [
  [data.counts.invoices, "invoices", "What was bought and sold, and the tax on each."],
  [data.counts.ledger_entries, "ledger entries", "What the accountant entered in the books."],
  [data.counts.bank_transactions, "bank lines", "What was actually paid and received."],
  [data.counts.gstr2b_lines, "GSTR-2B lines", "What your suppliers reported to the GST portal."],
];

/** Splits a headline into words that rise in one after the other on first paint. */
function Rise({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`}>
          {i > 0 ? " " : null}
          <span className="rise" style={{ "--rise-delay": `${120 + i * 55}ms` } as React.CSSProperties}>
            {word}
          </span>
        </span>
      ))}
    </span>
  );
}

export default function StartPage() {
  return (
    <div className="min-h-screen bg-app-bg">
      <ScrollProgress />
      <Nav />

      <section id="top" className="relative overflow-hidden pt-32">
        <div className={`grid items-center gap-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] ${WIDE}`}>
          <div>
            <p className={EYEBROW}>GST reconciliation, priced in rupees</p>
            <h1 className="display mt-7 max-w-[13ch]">
              <Rise text="Your GST records disagree." />
              <br />
              <span className="text-spark">
                <Rise text="See what it costs." />
              </span>
            </h1>
            <p className="lede mt-8 max-w-[46ch] text-ink">
              LedgerLens reconciles a month of books, prices every mismatch in rupees, shows the evidence and drafts the fix for you to approve.
            </p>
            <div className="mt-9">
              <StartActions pill withOverlay />
            </div>
            <p className="mt-5 text-[14px] font-light text-ink-3">
              Demo company: {data.company.name}, Delhi. September 2025, the month GST rates changed.
            </p>
          </div>
          <div className="relative">
            <ParticleField className="mx-auto aspect-square w-full max-w-[560px]" />
          </div>
        </div>
      </section>

      <section className={`${SECTION} ${WIDE}`}>
        <Reveal className="rounded-pill bg-paper p-10 shadow-float lg:p-12">
          <div className="flex flex-wrap items-baseline justify-between gap-6">
            <h2 className="heading">September 2025</h2>
            <p className="max-w-[46ch] text-[15px] font-light text-ink-2">
              {indian(summary.invoice_count)} invoices checked against the ledger, the bank statement and GSTR-2B. {summary.finding_counts_by_status.open} open Findings.
            </p>
          </div>
          <div className="mt-9">
            <MoneyStrip money={summary} />
          </div>
          <div className="mt-12 grid gap-14 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <div>
              <p className="label text-ink-3">Why credit is at risk</p>
              <div className="mt-6">
                <CauseBar causes={summary.itc_at_risk_by_cause} total={summary.itc_at_risk_paise} columns={2} />
              </div>
            </div>
            <div>
              <p className="label text-ink-3">Fix these first</p>
              <ol className="mt-4">
                {top.slice(0, 4).map((f, i) => (
                  <li key={`${f.record}-${i}`} className="grid grid-cols-[132px_1fr] items-baseline gap-5 border-t border-line py-4">
                    <span className="text-[22px] tracking-[-0.02em]">{rupees(f.impact_paise)}</span>
                    <span>
                      <span className="block text-[16px] font-light">{f.label}</span>
                      <span className="text-[13px] text-ink-3">
                        {f.party}, <span className="font-mono">{f.record}</span>, {IMPACT_WORDS[f.impact_type]}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="mt-12 text-[14px] font-light text-ink-3">The dashboard for the demo month. Everything on this page is the app itself with real results, not a picture.</p>
        </Reveal>
      </section>

      <section id="problem" className={`${SECTION} ${WIDE} scroll-mt-28`}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
          <Reveal>
            <h2 className="heading-lg max-w-[15ch]">Four records describe one purchase. They rarely agree.</h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="lede text-ink-2">One purchase is written down four times: on the invoice, in the books, in the bank statement and on the portal. LedgerLens reads all four and puts them side by side.</p>
          </Reveal>
        </div>

        <ol className="mt-24 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {RECORDS.map(([value, unit, text], i) => (
            <Reveal as="li" key={unit} delay={i * 90}>
              <p className="heading text-spark">
                <CountUp value={value} format={indian} />
              </p>
              <p className="mt-2 text-[16px] text-ink">{unit}</p>
              <p className="mt-3 text-[15px] font-light leading-relaxed text-ink-3">{text}</p>
            </Reveal>
          ))}
        </ol>

        <div className="mt-28 grid gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <Reveal>
            <p className="heading max-w-[20ch]">
              Where they differ, input tax credit is lost or tax is overpaid. In September 2025 that came to <span className="text-spark">{rupees(summary.itc_at_risk_paise)}</span> of credit at risk.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <p className="label text-ink-3">One example from that month</p>
            <dl className="mt-6 grid grid-cols-[130px_1fr] text-[17px] font-light leading-relaxed">
              <dt className="border-t border-line py-4 text-ink-3">In the books</dt>
              <dd className="border-t border-line py-4 text-ink">
                Purchase invoice <span className="font-mono text-[15px]">{top[0].record}</span> from {top[0].party}. Tax of {rupees(top[0].impact_paise)} claimed as credit.
              </dd>
              <dt className="border-t border-line py-4 text-ink-3">In GSTR-2B</dt>
              <dd className="border-t border-line py-4 text-ink">No line from that supplier with that invoice number, this month or the next.</dd>
              <dt className="border-y border-line py-4 text-ink-3">So</dt>
              <dd className="border-y border-line py-4 text-ink">{rupees(top[0].impact_paise)} of credit is at risk until the supplier reports it.</dd>
            </dl>
          </Reveal>
        </div>
      </section>

      <section id="how" className={`${SECTION} ${WIDE} scroll-mt-28`}>
        <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <h2 className="heading-lg max-w-[12ch]">Seven stages, one month.</h2>
              <p className="lede mt-8 max-w-[42ch] text-ink-2">
                This is the Run for September 2025, replayed. Each stage reports what it found, and the lines going by are real records from that month: an invoice number a supplier wrote its own way, one payment
                settling two invoices, a round trip of money.
              </p>
              <p className="mt-10 max-w-[30ch] text-[24px] font-light leading-snug tracking-[-0.02em]">Code decides every number. The language model only words the explanation and the draft.</p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <RunDemo stages={data.run.stages as StageEvent[]} items={data.run.items as FeedItem[]} />
          </Reveal>
        </div>
      </section>

      <section id="fix" className={`${SECTION} ${WIDE} scroll-mt-28`}>
        <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <Reveal delay={120} className="order-2 lg:order-1">
            <FindingDemo finding={data.finding as DemoFinding} excessPaise={summary.excess_tax_paise} netPayablePaise={summary.net_payable_paise} />
          </Reveal>
          <div className="order-1 lg:order-2 lg:sticky lg:top-32">
            <Reveal>
              <h2 className="heading-lg max-w-[12ch]">Evidence, then a fix you approve.</h2>
              <p className="lede mt-8 max-w-[42ch] text-ink-2">
                Every Finding shows the record next to what it should be, the rule that applies and the reason in plain words. Then a draft: a supplier email, a credit note or a ledger entry. Nothing leaves
                without your approval.
              </p>
              <p className="mt-10 max-w-[26ch] text-[24px] font-light leading-snug tracking-[-0.02em] text-spark">This one is real. Press Approve draft and watch the month&apos;s numbers move.</p>
            </Reveal>
          </div>
        </div>
      </section>

      {data.ring.story && (
        <section id="ring" className={`${SECTION} ${WIDE} scroll-mt-28`}>
          <div className="grid gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <Reveal>
              <h2 className="heading-lg max-w-[14ch]">A supplier and a customer with one owner.</h2>
            </Reveal>
            <Reveal delay={120}>
              <p className="lede text-ink-2">
                LedgerLens looks across everyone the company trades with. Here two registrations carry the same PAN, and money went out and came back with no invoice. It reports the link and what it puts at
                stake; a person decides what it means.
              </p>
            </Reveal>
          </div>
          <div className="mt-20">
            <RingStory story={data.ring.story as Story} period={data.period} creditAtRisk={data.ring.credit_paise} />
          </div>
        </section>
      )}

      <section id="proof" className={`${SECTION} ${WIDE} scroll-mt-28`}>
        <div className="grid items-start gap-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="lg:sticky lg:top-32">
            <Reveal>
              <h2 className="heading-lg max-w-[12ch]">Measured, not claimed.</h2>
              <p className="lede mt-8 max-w-[42ch] text-ink-2">
                The demo data has mistakes planted on purpose and a list of every one, so the catch rate and the false alarms can be counted. Switch between the two unseen months and the whole year: the
                misses are shown either way.
              </p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <ProofDemo proof={data.proof as DemoProof} />
          </Reveal>
        </div>
      </section>

      <section id="data" className={`${SECTION} ${WIDE} scroll-mt-28`}>
        <Reveal>
          <h2 className="heading-lg max-w-[10ch]">About the data</h2>
        </Reveal>
        <div className="mt-20 grid gap-12 lg:grid-cols-3">
          {[
            ["The company is made up.", "One year of books, April 2025 to March 2026, for a trader in Delhi. No real business or person is in it."],
            ["The mistakes are planted.", "Typos, duplicates, wrong rates, missing filings and a supplier ring, with a list of every one. That list is how accuracy is measured."],
            ["Real books will differ.", "Synthetic data is cleaner than the real thing. The numbers show the method works, not what it will score on your books."],
          ].map(([head, body], i) => (
            <Reveal key={head} delay={i * 110}>
              <p className="text-[24px] font-light leading-snug tracking-[-0.02em]">{head}</p>
              <p className="mt-4 text-[16px] font-light leading-relaxed text-ink-2">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden py-32 lg:py-44">
        <ParticleField className="pointer-events-none absolute inset-0 h-full w-full opacity-40" density={0.5} />
        <div className={`relative ${WIDE}`}>
          <h2 className="display max-w-[12ch]">Reconcile September 2025 now.</h2>
          <div className="mt-12">
            <StartActions pill />
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className={`flex flex-wrap items-center justify-between gap-4 py-10 ${WIDE}`}>
          <p className="text-[14px] font-light text-ink-3">LedgerLens. Built for Fintechstico V7.0, NSUT Consilium&apos;26, problem statement 2.</p>
          <a href="https://github.com/RAK2315/ledgerlens" className="label link-underline text-ink-3 hover:text-ink">
            Source
          </a>
        </div>
      </footer>
    </div>
  );
}
