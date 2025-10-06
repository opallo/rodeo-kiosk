import type { Metadata } from "next";
import Link from "next/link";
import TicketReceipt from "./ticket-receipt";

export const metadata: Metadata = {
  title: "Payment succeeded",
  description:
    "Review the ticket minted for this Stripe Checkout session and confirm webhook delivery.",
};

type PaymentSucceededPageProps = {
  searchParams?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentSucceededPage({ searchParams }: PaymentSucceededPageProps) {
  const resolvedSearchParams = await searchParams;
  const sessionParam = resolvedSearchParams?.session_id;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] : sessionParam;

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-10 text-neutral-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-emerald-500/20 bg-emerald-950/40 p-6 text-sm text-emerald-100 shadow-[0_20px_45px_-40px_rgba(16,185,129,0.9)]">
          <div className="flex flex-col gap-1 text-xs uppercase tracking-[0.32em] text-emerald-400/80 sm:flex-row sm:items-center sm:justify-between">
            <span className="rounded-full border border-emerald-400/30 bg-emerald-950/50 px-3 py-1 text-[10px] font-semibold text-emerald-200">
              Payment confirmed
            </span>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-900/40 px-3 py-1 text-[10px] font-semibold tracking-[0.24em] text-emerald-100 transition hover:border-emerald-200/60 hover:bg-emerald-900/60"
            >
              ← Back to control deck
            </Link>
          </div>
          <div className="space-y-2 text-sm normal-case tracking-normal text-emerald-100">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">Your ticket is almost ready</h1>
            <p className="max-w-2xl text-sm text-emerald-100/80">
              We redirect here after Stripe Checkout succeeds. Once the webhook finishes minting the ticket, it will appear below
              along with the purchase details fetched from Convex.
            </p>
          </div>
        </header>

        <section className="rounded-3xl border border-neutral-800/60 bg-neutral-950/70 p-6 shadow-[0_20px_50px_-48px_rgba(59,130,246,0.6)]">
          <TicketReceipt sessionId={sessionId} />
        </section>

        <footer className="rounded-3xl border border-neutral-800/50 bg-neutral-950/70 p-5 text-xs text-neutral-400">
          <div className="space-y-2">
            <p className="font-semibold uppercase tracking-[0.28em] text-neutral-500">Next steps</p>
            <p>
              Connect your local Stripe CLI webhook forwarder so successful checkout events populate Convex. The official Stripe
              guide on
              <a
                href="https://stripe.com/docs/payments/checkout/fulfill-orders"
                target="_blank"
                rel="noreferrer"
                className="ml-1 text-emerald-300 underline decoration-dotted underline-offset-4 hover:text-emerald-200"
              >
                fulfilling orders with Checkout
              </a>
              {" "}
              covers the flow we expect.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
