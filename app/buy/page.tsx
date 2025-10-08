"use client";

import { ReactNode, useMemo, useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { SignInButton, useUser } from "@clerk/nextjs";

import { api } from "@/convex/_generated/api";
import { PRICE_CATALOG } from "@/lib/pricing";

const PRICE_ID = PRICE_CATALOG.generalAdmission.priceId;

function Authorized({ children }: { children: ReactNode }) {
  return <Authenticated>{children}</Authenticated>;
}

function Unauthorized({ children }: { children: ReactNode }) {
  return <Unauthenticated>{children}</Unauthenticated>;
}

function TicketPurchasePanel({ priceId }: { priceId: string }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "info" | "error"; message: string } | null>(null);

  const totalLabel = useMemo(() => {
    const basePrice = 85;
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(basePrice * qty);
  }, [qty]);

  const adjustQuantity = (delta: number) => {
    setQty((current) => Math.max(1, current + delta));
  };

  const handleCheckout = async () => {
    setLoading(true);
    setFeedback({
      tone: "info",
      message: `Preparing checkout for ${qty} ticket${qty === 1 ? "" : "s"}...`,
    });

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, quantity: qty }),
      });

      const { url, error } = await response.json();

      if (error) {
        setFeedback({ tone: "error", message: "Checkout responded with an error. Please try again." });
        return;
      }

      if (!url) {
        setFeedback({
          tone: "error",
          message: "We couldn’t find a checkout session to open. Please try once more.",
        });
        return;
      }

      setFeedback({ tone: "info", message: "Redirecting you to Stripe Checkout..." });
      window.open(url, "_self");
    } catch (error) {
      console.error("Error creating checkout session", error);
      setFeedback({
        tone: "error",
        message: "We hit a network hiccup starting your checkout. Check your connection and retry.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-6 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">Secure checkout</p>
        <h2 className="text-2xl font-semibold text-stone-900">Pick your tickets</h2>
        <p className="text-sm text-stone-600">
          Tickets are $85 each. Adjust the quantity and we’ll hand you off to Stripe to finish the purchase.
        </p>
      </header>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-2">
          <button
            type="button"
            onClick={() => adjustQuantity(-1)}
            disabled={loading || qty <= 1}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-semibold text-stone-600 transition hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <div className="flex h-11 min-w-[3.5rem] items-center justify-center rounded-xl bg-white px-4 text-lg font-semibold text-stone-900 shadow-inner">
            {qty}
          </div>
          <button
            type="button"
            onClick={() => adjustQuantity(1)}
            disabled={loading}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-semibold text-stone-600 transition hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>

        <div className="flex flex-col items-start gap-1 text-left sm:items-end">
          <span className="text-xs uppercase tracking-[0.24em] text-stone-500">Total</span>
          <span className="text-2xl font-semibold text-amber-700">{totalLabel}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70"
      >
        {loading ? "Starting checkout..." : `Purchase ${qty} Ticket${qty === 1 ? "" : "s"}`}
      </button>

      <div className="grid gap-4 sm:grid-cols-3">
        {["Chute-side action", "Secure payment", "Instant delivery"].map((headline, index) => (
          <div key={headline} className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            <p className="font-semibold text-stone-800">{headline}</p>
            <p className="mt-1 text-xs text-stone-500">
              {[
                "Feel the dust fly with premier seating for every ride.",
                "Stripe keeps your payment safe from start to finish.",
                "Check your inbox moments after payment for your tickets.",
              ][index]}
            </p>
          </div>
        ))}
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : (
        <p className="text-sm text-stone-500">Need a hand? Find our crew at the front gate for quick help.</p>
      )}
    </section>
  );
}

function PurchaseHistory() {
  const purchases = useQuery(api.purchases.listSuccessfulForCurrentUser, {});

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  const renderBody = () => {
    if (purchases === undefined) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-sm text-stone-500">
            Loading purchase history...
          </td>
        </tr>
      );
    }

    if (purchases.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-6 text-center text-sm text-stone-500">
            No completed purchases yet. Your receipts will land here after checkout.
          </td>
        </tr>
      );
    }

    return purchases.map((purchase) => {
      const ticketIds = purchase.ticketIds;
      const ticketCount = ticketIds.length;
      const amount = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: purchase.currency.toUpperCase(),
      }).format(purchase.amountTotal / 100);

      const issuedAt = dateFormatter.format(new Date(purchase.createdAt));

      return (
        <tr key={purchase.stripeSessionId} className="border-t border-stone-200">
          <td className="px-4 py-3 text-sm font-medium text-stone-800">{issuedAt}</td>
          <td className="px-4 py-3 text-sm text-stone-600">{purchase.eventId}</td>
          <td
            className="px-4 py-3 text-sm text-stone-600"
            title={ticketCount > 0 ? ticketIds.join(", ") : undefined}
          >
            {ticketCount > 0 ? `${ticketCount} ticket${ticketCount === 1 ? "" : "s"}` : "Tickets pending"}
          </td>
          <td className="px-4 py-3 text-sm font-semibold text-amber-700">{amount}</td>
        </tr>
      );
    });
  };

  return (
    <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">Your receipts</p>
        <h2 className="text-xl font-semibold text-stone-900">Past successful purchases</h2>
        <p className="text-sm text-stone-600">
          Track every paid checkout in one place. We keep the last 20 receipts handy for quick reference.
        </p>
      </header>

      <div className="overflow-hidden rounded-2xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200 text-left">
          <thead className="bg-stone-50 text-xs uppercase tracking-[0.2em] text-stone-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Purchased
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Event
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Tickets
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white">{renderBody()}</tbody>
        </table>
      </div>
    </section>
  );
}

export default function BuyPage() {
  const { user } = useUser();
  const welcomeName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress || "friend";

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/40 to-white text-stone-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 pb-24 pt-16">
        <Unauthorized>
          <section className="space-y-8">
            <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-10 text-center shadow-lg shadow-amber-100/50">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-600">Canyon Classic Rodeo</p>
              <h1 className="text-4xl font-semibold leading-tight text-stone-900 sm:text-5xl">
                Saddle up for a dust-kicking night under the arena lights.
              </h1>
              <p className="text-lg text-stone-600">
                From bronc busting to barrel racing, the Canyon Classic delivers the best show in the valley. Sign in to grab
                your seats before the gates open.
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center rounded-2xl bg-amber-600 px-6 py-3 text-lg font-semibold text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Purchase your tickets
                  </button>
                </SignInButton>
                <span className="text-sm text-stone-500">No account yet? You can create one during sign-in.</span>
              </div>
            </div>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Dates", value: "July 18 – 20" },
                { label: "Location", value: "Canyon County Fairgrounds" },
                { label: "Highlights", value: "Pro riders · Live music · Local eats" },
              ].map((item) => (
                <div key={item.label} className="space-y-2 rounded-3xl border border-amber-100 bg-white/70 p-5 text-center">
                  <dt className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-600">{item.label}</dt>
                  <dd className="text-base font-semibold text-stone-800">{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Unauthorized>

        <Authorized>
          <section className="space-y-10">
            <header className="space-y-3 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-emerald-600">Welcome back</p>
              <h1 className="text-4xl font-semibold text-stone-900 sm:text-5xl">Ready to ride, {welcomeName}?</h1>
              <p className="mx-auto max-w-2xl text-lg text-stone-600">
                Choose how many tickets you need, head through checkout, and we’ll have your confirmation waiting below the moment
                Stripe marks it paid.
              </p>
            </header>

            <div className="space-y-8">
              <TicketPurchasePanel priceId={PRICE_ID} />
              <PurchaseHistory />
            </div>
          </section>
        </Authorized>
      </div>
    </main>
  );
}
