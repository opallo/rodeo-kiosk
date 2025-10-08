"use client";

import { ReactNode, useMemo, useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, useUser } from "@clerk/nextjs";

const PRICE_ID = "price_1SCow4LGtZ8BdkwqLaowXCyE";

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
      message: `Creating a secure checkout for ${qty} ticket${qty === 1 ? "" : "s"}...`,
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
          message: "We couldn't find a checkout session to open. Please try once more.",
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
    <div className="space-y-6 rounded-3xl bg-white/90 p-8 shadow-xl ring-1 ring-slate-100 backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-400">Rodeo tickets</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Secure your seats</h2>
          <p className="mt-2 text-base text-slate-600">
            Choose how many tickets you need and complete your purchase with our trusted checkout powered by Stripe.
          </p>
        </div>
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-right text-sm font-semibold text-rose-500">
          <div className="text-xs uppercase tracking-[0.2em] text-rose-400">Total</div>
          <div className="text-2xl text-rose-500">{totalLabel}</div>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-100 p-2 shadow-inner">
          <button
            type="button"
            onClick={() => adjustQuantity(-1)}
            disabled={loading || qty <= 1}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            −
          </button>
          <div className="flex h-11 min-w-[3.5rem] items-center justify-center rounded-xl bg-white px-4 text-lg font-semibold text-slate-900 shadow">
            {qty}
          </div>
          <button
            type="button"
            onClick={() => adjustQuantity(1)}
            disabled={loading}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-rose-500 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
        >
          {loading ? "Starting checkout..." : `Purchase ${qty} Ticket${qty === 1 ? "" : "s"}`}
        </button>
      </div>

      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
        <div className="rounded-2xl bg-amber-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400">Premium seats</p>
          <p className="mt-1 text-slate-700">Choose the quantity that fits your crew—no extra steps required.</p>
        </div>
        <div className="rounded-2xl bg-sky-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Secure checkout</p>
          <p className="mt-1 text-slate-700">Stripe handles the payment so your details stay protected end to end.</p>
        </div>
        <div className="rounded-2xl bg-emerald-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Instant delivery</p>
          <p className="mt-1 text-slate-700">Tickets arrive in your inbox immediately after your purchase is complete.</p>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.tone === "error"
              ? "border-rose-200 bg-rose-50 text-rose-600"
              : "border-sky-200 bg-sky-50 text-sky-700"
          }`}
        >
          {feedback.message}
        </div>
      ) : (
        <p className="text-sm text-slate-500">
          Need a hand? Our support team is standing by at the arena to help you with anything.
        </p>
      )}
    </div>
  );
}

export default function BuyPage() {
  const { user } = useUser();
  const welcomeName = user?.firstName || user?.fullName || user?.primaryEmailAddress?.emailAddress || "friend";

  return (
    <main className="min-h-screen bg-gradient-to-br from-white via-rose-50 to-amber-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-20">
        <Unauthorized>
          <section className="grid gap-12 rounded-3xl bg-white/90 p-10 shadow-2xl shadow-rose-100 ring-1 ring-rose-100 backdrop-blur-lg lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full bg-rose-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">
                Live at the Canyon Arena
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
                Saddle up for a night of broncos, barrels, and big air.
              </h1>
              <p className="text-lg text-slate-600">
                Experience the electrifying energy of the Rodeo Classic with VIP-worthy production, local flavors, and nonstop thrills. Secure your tickets in just a couple of clicks.
              </p>
              <div className="flex flex-wrap gap-4">
                <SignInButton mode="modal">
                  <button className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-6 py-3 text-lg font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white">
                    Purchase your tickets
                  </button>
                </SignInButton>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-600 shadow">
                  <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  <span>No account? Create one during sign-in.</span>
                </div>
              </div>
              <dl className="grid gap-4 text-sm text-slate-600 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-100/80 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Dates</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">July 18 – 20</dd>
                </div>
                <div className="rounded-2xl bg-slate-100/80 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Location</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">Canyon County Fairgrounds</dd>
                </div>
                <div className="rounded-2xl bg-slate-100/80 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Highlights</dt>
                  <dd className="mt-1 text-base font-semibold text-slate-900">Pro riders, live music, food trucks</dd>
                </div>
              </dl>
            </div>
            <div className="relative hidden overflow-hidden rounded-3xl bg-gradient-to-br from-amber-200 via-white to-rose-200 lg:block">
              <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=900&q=80')] bg-cover bg-center opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-br from-rose-100/70 via-white/60 to-amber-200/70" />
              <div className="relative z-10 flex h-full flex-col justify-end p-10 text-slate-800">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-600">What to expect</p>
                <p className="mt-3 text-2xl font-semibold leading-snug text-slate-900">
                  Heart-pounding rides, championship stakes, and the best night out west of the Rockies.
                </p>
              </div>
            </div>
          </section>
        </Unauthorized>

        <Authorized>
          <section className="space-y-10">
            <header className="space-y-4 text-center">
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500">
                Welcome back
              </span>
              <h1 className="text-4xl font-semibold text-slate-900 sm:text-5xl">Ready to ride, {welcomeName}?</h1>
              <p className="mx-auto max-w-2xl text-lg text-slate-600">
                You&apos;re just a click away from locking in your seats to the Rodeo Classic. Review your ticket count below and we&apos;ll handle the rest through Stripe&apos;s secure checkout.
              </p>
            </header>

            <TicketPurchasePanel priceId={PRICE_ID} />
          </section>
        </Authorized>
      </div>
    </main>
  );
}
