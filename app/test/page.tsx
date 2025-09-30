"use client"

import { useMemo, useState } from "react";
import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

export default function Home() {
  type StripeEvent = {
    id: string;
    status: "succeeded" | "pending" | "requires_action";
    amount: number;
    currency: string;
    createdAt: string;
    description: string;
    source: "dashboard" | "webhook";
  };

  const { user, isLoaded, isSignedIn } = useUser();
  const messages = useQuery(api.messages.getForCurrentUser, isSignedIn ? {} : "skip");

  const addMessage = useMutation(api.messages.add);

  const [quantity, setQuantity] = useState(1);
  const [stripeEvents, setStripeEvents] = useState<StripeEvent[]>(() => [
    {
      id: "evt_init_dash",
      status: "pending",
      amount: 0,
      currency: "usd",
      createdAt: new Date().toISOString(),
      description: "Stripe console initialized",
      source: "dashboard",
    },
  ]);

  const stripeSummary = useMemo(() => {
    const total = stripeEvents.reduce((acc, event) => acc + event.amount, 0);
    return {
      count: stripeEvents.length,
      total,
      latest: stripeEvents[0],
    };
  }, [stripeEvents]);

  const recordStripeEvent = (event: Omit<StripeEvent, "id" | "createdAt">) => {
    const fullEvent: StripeEvent = {
      ...event,
      id: `evt_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    console.debug("Stripe event", fullEvent);
    setStripeEvents((prev) => [fullEvent, ...prev].slice(0, 8));
  };

  const handleAddDemoMessage = () => {
    addMessage({ body: "demo-" + Date.now() });
  };

  const handleClerkTest = () => {
    console.debug("Clerk debug", {
      isLoaded,
      isSignedIn,
      userId: user?.id,
      email: user?.primaryEmailAddress?.emailAddress,
    });
  };

  const handleConvexTest = () => {
    console.debug("Convex debug", {
      isSignedIn,
      messageCount: messages?.length ?? "n/a",
      messages,
    });
  };

  const handleStripePing = () => {
    recordStripeEvent({
      status: "requires_action",
      amount: 0,
      currency: "usd",
      description: "Test webhook ping",
      source: "webhook",
    });
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handlePurchase = () => {
    const total = quantity * 14900;
    recordStripeEvent({
      status: "succeeded",
      amount: total,
      currency: "usd",
      description: `Mock purchase for ${quantity} Rodeo ticket${quantity > 1 ? "s" : ""}`,
      source: "dashboard",
    });

    console.debug("Ticket purchase", { quantity, total });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-12 text-neutral-100">
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950/70 shadow-[0_40px_120px_-60px_rgba(15,15,15,0.8)]">
          <div className="flex flex-col gap-6 border-b border-neutral-800/80 bg-neutral-900/60 px-6 py-10 text-center sm:px-10">
            <p className="mx-auto w-fit rounded-full border border-fuchsia-500/40 bg-fuchsia-900/20 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-fuchsia-200/80">
              Rodeo Platform
            </p>
            <div className="space-y-4">
              <h1 className="font-semibold tracking-tight text-white text-3xl sm:text-[2.6rem]">rodeo-kiosk</h1>
              <p className="mx-auto max-w-xl text-sm text-neutral-300 sm:text-base">
                A consolidated console for Clerk authentication and Convex diagnostics.
              </p>
            </div>
          </div>

          <div className="space-y-10 bg-neutral-900/40 px-6 py-10 sm:px-10">
            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-6">
                <header className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.35em] text-fuchsia-300/70">Clerk access</p>
                  <h2 className="text-lg font-semibold text-white">Authentication</h2>
                  <p className="text-sm text-neutral-400">
                    Manage the current session and trigger Clerk specific debugging hooks.
                  </p>
                </header>
                <div className="mt-5 space-y-4">
                  <Unauthenticated>
                    <SignInButton mode="modal">
                      <button className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-fuchsia-500/30 bg-fuchsia-900/40 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-fuchsia-300/60 hover:bg-fuchsia-800/50">
                        Sign in with Clerk
                      </button>
                    </SignInButton>
                  </Unauthenticated>
                  <Authenticated>
                    <div className="space-y-3 rounded-xl border border-fuchsia-500/20 bg-fuchsia-900/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] uppercase tracking-[0.32em] text-neutral-400">Current user</span>
                        <UserButton userProfileMode="modal" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-fuchsia-500/30 bg-fuchsia-800/40 px-3.5 py-2 text-sm font-medium text-white transition hover:border-fuchsia-300/60 hover:bg-fuchsia-700/50"
                          onClick={handleClerkTest}
                        >
                          Test Clerk
                        </button>
                        <button
                          className="inline-flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-800/30 px-3.5 py-2 text-sm font-medium text-emerald-50 transition hover:border-emerald-300/60 hover:bg-emerald-700/40"
                          onClick={handleAddDemoMessage}
                        >
                          Add demo message
                        </button>
                      </div>
                    </div>
                  </Authenticated>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-6">
                <header className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-300/70">Diagnostics</p>
                  <h2 className="text-lg font-semibold text-white">Convex actions</h2>
                  <p className="text-sm text-neutral-400">
                    Fire server-side mutations and confirm that Convex is responding.
                  </p>
                </header>
                <div className="mt-6 space-y-3">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-900/40 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-800/50"
                    onClick={handleConvexTest}
                  >
                    Test Convex
                  </button>
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg border border-amber-500/20 bg-neutral-900/60 p-3 text-amber-100/90">
                    <dt className="text-[11px] uppercase tracking-[0.28em] text-amber-200/60">Status</dt>
                    <dd className="mt-1 font-semibold">
                      {messages === undefined ? "Pending" : `${messages.length} messages`}
                    </dd>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-neutral-900/60 p-3 text-amber-100/90">
                    <dt className="text-[11px] uppercase tracking-[0.28em] text-amber-200/60">Auth</dt>
                    <dd className="mt-1 font-semibold">{isSignedIn ? "Signed in" : "Guest"}</dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-6">
                <header className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.35em] text-sky-300/70">Stripe tools</p>
                  <h2 className="text-lg font-semibold text-white">Payments console</h2>
                  <p className="text-sm text-neutral-400">
                    Generate mock Stripe events to verify dashboard integrations.
                  </p>
                </header>
                <div className="mt-6 space-y-4">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/40 bg-sky-900/40 px-4 py-2.5 text-sm font-semibold text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-800/50"
                    onClick={handleStripePing}
                  >
                    Log webhook ping
                  </button>
                  <div className="rounded-lg border border-sky-500/20 bg-neutral-900/60 p-4 text-sm text-sky-100/90">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/60">Latest event</p>
                    {stripeSummary.latest ? (
                      <div className="mt-2 space-y-1">
                        <p className="font-semibold">{stripeSummary.latest.description}</p>
                        <p className="text-xs text-neutral-400">
                          {new Date(stripeSummary.latest.createdAt).toLocaleTimeString()} · {stripeSummary.latest.status}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-neutral-500">No events logged yet.</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs text-neutral-400">
                    <div className="rounded-lg border border-sky-500/20 bg-neutral-950/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/60">Events</p>
                      <p className="mt-1 text-base font-semibold text-white">{stripeSummary.count}</p>
                    </div>
                    <div className="rounded-lg border border-sky-500/20 bg-neutral-950/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.28em] text-sky-200/60">Captured</p>
                      <p className="mt-1 text-base font-semibold text-white">
                        ${(stripeSummary.total / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-6">
                <header className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.32em] text-fuchsia-300/70">Clerk stream</span>
                  <h3 className="text-lg font-semibold text-white">State snapshot</h3>
                </header>
                <pre className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-fuchsia-500/15 bg-neutral-950/90 p-4 text-xs leading-relaxed text-fuchsia-100">
{isLoaded
  ? JSON.stringify(
      {
        isSignedIn,
        userId: user?.id ?? null,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
      },
      null,
      2,
    )
  : "Loading Clerk state..."}
                </pre>
              </div>

              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-6">
                <header className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.32em] text-amber-300/70">Convex stream</span>
                  <h3 className="text-lg font-semibold text-white">Data snapshot</h3>
                </header>
                <pre className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-amber-500/15 bg-neutral-950/90 p-4 text-xs leading-relaxed text-amber-100">
{(() => {
  if (!isLoaded) return "Loading Clerk state...";
  if (!isSignedIn) return "Sign in to load Convex data.";
  if (messages === undefined) return "Loading Convex data...";
  if (messages.length === 0) return "No messages yet.";
  return JSON.stringify({ messageCount: messages.length, messages }, null, 2);
})()}
                </pre>
              </div>

              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-6">
                <header className="flex flex-col gap-1">
                  <span className="text-[11px] uppercase tracking-[0.32em] text-sky-300/70">Stripe stream</span>
                  <h3 className="text-lg font-semibold text-white">Event log</h3>
                </header>
                <pre className="mt-4 max-h-60 overflow-y-auto rounded-xl border border-sky-500/15 bg-neutral-950/90 p-4 text-xs leading-relaxed text-sky-100">
{stripeEvents.length
  ? JSON.stringify(stripeEvents, null, 2)
  : "Awaiting Stripe events..."}
                </pre>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-neutral-800/70 bg-neutral-950/70 p-6 lg:col-span-2">
                <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.32em] text-sky-300/70">Ticketing sandbox</span>
                    <h3 className="mt-1 text-xl font-semibold text-white">Purchase mock</h3>
                    <p className="text-sm text-neutral-400">
                      Adjust the quantity to simulate a Rodeo ticket purchase flow.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-900/30 px-3 py-1 text-xs font-medium text-sky-100">
                    Debug mode
                  </div>
                </header>

                <div className="mt-6 grid gap-4 rounded-xl border border-sky-500/25 bg-neutral-900/50 p-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.32em] text-neutral-500">Quantity</span>
                    <p className="mt-1 text-sm text-neutral-300">Tickets in this mock checkout.</p>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-500/30 bg-sky-900/40 text-lg font-semibold text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-800/50"
                      onClick={() => handleQuantityChange(-1)}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="min-w-[3rem] rounded-lg border border-neutral-700/60 bg-neutral-950/70 px-4 py-2 text-center text-lg font-semibold tracking-wide text-white">
                      {quantity}
                    </span>
                    <button
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-sky-500/30 bg-sky-900/40 text-lg font-semibold text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-800/50"
                      onClick={() => handleQuantityChange(1)}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <div className="md:text-right">
                    <button
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-900/40 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-800/50 md:w-auto"
                      onClick={handlePurchase}
                    >
                      Complete purchase
                    </button>
                    <p className="mt-2 text-xs text-neutral-400">
                      {(quantity * 14900 / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
