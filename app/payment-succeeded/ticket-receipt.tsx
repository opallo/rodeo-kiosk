"use client";

import { useMemo } from "react";
import { Unauthenticated, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AlertCircle, CheckCircle2, Clock3, Loader2, ShieldAlert, Ticket as TicketIcon } from "lucide-react";

type TicketReceiptProps = {
  sessionId?: string;
};

type TicketQueryResult =
  | { status: "unauthenticated" }
  | { status: "not_found" }
  | { status: "forbidden" }
  | {
      status: "pending";
      purchase: {
        createdAt: number;
        paymentStatus: string;
        amountTotal: number;
        currency: string;
      };
    }
  | {
      status: "ready";
      ticket: {
        ticketId: string;
        eventId: string;
        status: string;
        issuedAt: number;
        validFrom: number | null;
        validTo: number | null;
      };
      purchase: {
        createdAt: number;
        paymentStatus: string;
        amountTotal: number;
        currency: string;
      };
    };

const formatCurrency = (amountCents: number, currency: string) => {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
};

const formatTimestamp = (ms: number) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ms));

export default function TicketReceipt({ sessionId }: TicketReceiptProps) {
  const result = useQuery(api.tickets.getByStripeSession, sessionId ? { sessionId } : "skip");
  const typedResult = result as TicketQueryResult | undefined;
  const validityWindows = useMemo(() => {
    if (!typedResult || typedResult.status !== "ready") return [];
    const windows: string[] = [];
    if (typedResult.ticket.validFrom) {
      windows.push(`Valid from ${formatTimestamp(typedResult.ticket.validFrom)}`);
    }
    if (typedResult.ticket.validTo) {
      windows.push(`Valid until ${formatTimestamp(typedResult.ticket.validTo)}`);
    }
    return windows;
  }, [typedResult]);

  if (!sessionId) {
    return (
      <div className="grid gap-4 text-sm text-neutral-300">
        <div className="flex items-center gap-3 rounded-2xl border border-amber-400/40 bg-amber-900/20 p-4 text-amber-100">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold uppercase tracking-[0.28em] text-amber-200">Missing session reference</p>
            <p className="text-amber-100/80">
              Stripe should append a <code className="rounded bg-neutral-900 px-1 py-0.5 text-xs text-amber-200">session_id</code> query
              parameter to the success URL. Confirm your <code className="rounded bg-neutral-900 px-1 py-0.5 text-xs text-amber-200">success_url</code>
              includes <code className="rounded bg-neutral-900 px-1 py-0.5 text-xs text-amber-200">?session_id={"{CHECKOUT_SESSION_ID}"}</code>.
            </p>
          </div>
        </div>
        <Link
          href="/"
          className="inline-flex max-w-fit items-center gap-2 rounded-full border border-neutral-700/70 bg-neutral-900/60 px-4 py-2 text-xs uppercase tracking-[0.28em] text-neutral-200 transition hover:border-neutral-500/70 hover:bg-neutral-900"
        >
          Return home
        </Link>
      </div>
    );
  }

  if (result === undefined) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-sky-400/30 bg-sky-900/20 p-6 text-sky-100">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
        <p className="text-sm">Checking Convex for the ticket minted from this session…</p>
      </div>
    );
  }

  if (!typedResult) {
    return null;
  }

  if (typedResult.status === "unauthenticated") {
    return (
      <Unauthenticated>
        <div className="grid gap-4 rounded-2xl border border-neutral-700/60 bg-neutral-900/60 p-6 text-neutral-200">
          <p className="text-sm">
            Sign in with the same account that completed checkout to reveal the ticket minted for this session.
          </p>
          <SignInButton mode="modal">
            <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-400/40 bg-sky-900/40 px-4 py-2 text-sm font-semibold text-white transition hover:border-sky-200/60 hover:bg-sky-900/60">
              Sign in to continue
            </button>
          </SignInButton>
        </div>
      </Unauthenticated>
    );
  }

  if (typedResult.status === "forbidden") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/40 p-5 text-sm text-rose-100">
        <ShieldAlert className="h-6 w-6 shrink-0" />
        <div className="space-y-2">
          <p className="text-base font-semibold text-white">Access denied</p>
          <p className="text-rose-100/80">
            This checkout session belongs to a different signed-in user. Sign in with the correct account or launch a new checkout
            from the kiosk dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (typedResult.status === "not_found") {
    return (
      <div className="grid gap-3 rounded-2xl border border-neutral-700/60 bg-neutral-900/60 p-6 text-neutral-300">
        <div className="flex items-center gap-3 text-sm">
          <AlertCircle className="h-5 w-5 text-neutral-400" />
          <p>
            We could not find a purchase linked to this session yet. Give the webhook a moment to arrive, then refresh this page.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">
          Tip: verify your webhook listener is forwarding <code className="rounded bg-neutral-950 px-1 py-0.5 text-[10px]">checkout.session.completed</code>
          events to Convex.
        </p>
      </div>
    );
  }

  const purchaseSummary = (
    <div className="grid gap-1 rounded-2xl border border-neutral-700/40 bg-neutral-900/40 p-4 text-xs uppercase tracking-[0.24em] text-neutral-400">
      <span className="text-neutral-200">Purchase summary</span>
      <div className="grid gap-1 text-[11px] normal-case tracking-normal text-neutral-300">
        <span>
          Amount:&nbsp;
          <strong className="text-neutral-100">
            {formatCurrency(typedResult.purchase.amountTotal, typedResult.purchase.currency)}
          </strong>
        </span>
        <span>
          Status:&nbsp;
          <strong className="text-neutral-100">{typedResult.purchase.paymentStatus}</strong>
        </span>
        <span>
          Created:&nbsp;
          <strong className="text-neutral-100">{formatTimestamp(typedResult.purchase.createdAt)}</strong>
        </span>
      </div>
    </div>
  );

  if (typedResult.status === "pending") {
    return (
      <div className="grid gap-4">
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/40 bg-amber-900/30 p-5 text-sm text-amber-100">
          <Clock3 className="h-6 w-6 shrink-0" />
          <div className="space-y-2">
            <p className="text-base font-semibold text-white">Waiting for ticket minting</p>
            <p className="text-amber-100/80">
              The purchase has been recorded but the ticket document has not been generated yet. Once your webhook handler writes to
              the <code className="rounded bg-neutral-900 px-1 py-0.5 text-xs text-amber-200">tickets</code> table, it will appear here automatically.
            </p>
          </div>
        </div>
        {purchaseSummary}
      </div>
    );
  }

  if (typedResult.status === "ready") {
    return (
      <div className="grid gap-5">
        <div className="grid gap-4 rounded-3xl border border-emerald-500/40 bg-emerald-950/30 p-6 text-emerald-100">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.32em] text-emerald-300/80">Ticket ready</p>
              <h2 className="text-2xl font-semibold text-white">Session minted ticket</h2>
            </div>
            <CheckCircle2 className="h-6 w-6 text-emerald-300" aria-hidden />
          </div>
          <div className="grid gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-900/30 p-5 text-sm text-emerald-50">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-900/40">
                <TicketIcon className="h-6 w-6" aria-hidden />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Ticket id</p>
                <p className="font-mono text-lg text-white">{typedResult.ticket.ticketId}</p>
              </div>
            </div>
            <dl className="grid gap-3 text-xs uppercase tracking-[0.28em] text-emerald-200">
              <div className="flex flex-col gap-1 rounded-xl border border-emerald-400/20 bg-emerald-900/40 p-4 text-[11px] text-emerald-100">
                <dt>Event reference</dt>
                <dd className="font-mono text-base tracking-normal text-white">{typedResult.ticket.eventId}</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-emerald-400/20 bg-emerald-900/40 p-4 text-[11px] text-emerald-100">
                <dt>Status</dt>
                <dd className="text-base tracking-normal text-white">{typedResult.ticket.status}</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl border border-emerald-400/20 bg-emerald-900/40 p-4 text-[11px] text-emerald-100">
                <dt>Issued</dt>
                <dd className="text-base tracking-normal text-white">{formatTimestamp(typedResult.ticket.issuedAt)}</dd>
              </div>
              {validityWindows.map((window) => (
                <div
                  key={window}
                  className="flex flex-col gap-1 rounded-xl border border-emerald-400/20 bg-emerald-900/40 p-4 text-[11px] text-emerald-100"
                >
                  <dt>Validity</dt>
                  <dd className="text-base tracking-normal text-white">{window}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-xl border border-emerald-400/20 bg-emerald-900/40 p-4 text-xs text-emerald-100/80">
              <p className="uppercase tracking-[0.24em] text-emerald-200">Implementation note</p>
              <p className="mt-2 text-sm normal-case tracking-normal">
                Swap this block with your production ticket component (QR code, barcode, etc.). The Convex query already provides the
                identifiers you need to render it securely on the client.
              </p>
            </div>
          </div>
        </div>
        {purchaseSummary}
      </div>
    );
  }

  return null;
}
