"use client";

import { useMemo, useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser();
  const messages = useQuery(api.messages.getForCurrentUser, isSignedIn ? {} : "skip");

  const addMessage = useMutation(api.messages.add);
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

  const [quantity, setQuantity] = useState(1);
  const [stripeLogs, setStripeLogs] = useState<Array<{ timestamp: string; quantity: number }>>([]);

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => {
      const next = prev + delta;
      return next < 1 ? 1 : next;
    });
  };

  const handleStripeDebug = () => {
    const timestamp = new Date().toISOString();
    console.debug("Stripe checkout skeleton", { quantity, timestamp });
    setStripeLogs((prev) => [{ timestamp, quantity }, ...prev]);
  };

  const stripeLogText = useMemo(() => {
    if (stripeLogs.length === 0) {
      return "No Stripe purchases simulated yet.";
    }

    return stripeLogs
      .map((entry, index) => `${index + 1}. ${entry.timestamp} — qty ${entry.quantity}`)
      .join("\n");
  }, [stripeLogs]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-12 text-neutral-100">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950/70 shadow-[0_40px_120px_-60px_rgba(15,15,15,0.8)]">
          <div className="flex flex-col gap-6 border-b border-neutral-800/80 bg-neutral-900/60 px-6 py-10 text-center sm:px-10">
            <p className="mx-auto w-fit rounded-full border border-fuchsia-500/40 bg-fuchsia-900/20 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-fuchsia-200/80">
              Rodeo Platform
            </p>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem]">rodeo-kiosk</h1>
              <p className="mx-auto max-w-2xl text-sm text-neutral-300 sm:text-base">
                A consolidated console for Clerk authentication, Convex diagnostics, and Stripe checkout prototyping.
              </p>
            </div>
          </div>

          <section className="grid gap-6 border-b border-neutral-800/80 bg-neutral-950/60 px-6 py-8 sm:px-10 md:grid-cols-2 xl:grid-cols-3 xl:py-10">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/40 via-neutral-950/40 to-fuchsia-900/20 p-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-fuchsia-200">Authentication</h2>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Clerk access</p>
                <p className="text-sm text-neutral-300">
                  Sign in with Clerk to unlock the debugging utilities.
                </p>
              </div>
              <div className="mt-6">
                <Unauthenticated>
                  <SignInButton mode="modal">
                    <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-fuchsia-500/40 bg-fuchsia-900/30 px-4 py-3 text-sm font-semibold text-white transition hover:border-fuchsia-300/60 hover:bg-fuchsia-800/40">
                      Sign in with Clerk
                    </button>
                  </SignInButton>
                </Unauthenticated>
                <Authenticated>
                  <div className="grid gap-4 rounded-xl border border-fuchsia-500/30 bg-fuchsia-900/20 p-5">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs uppercase tracking-widest text-neutral-400">Current user</span>
                      <UserButton userProfileMode="modal" />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        className="inline-flex items-center justify-center rounded-lg border border-fuchsia-500/30 bg-fuchsia-800/40 px-4 py-2 text-sm font-medium text-white transition hover:border-fuchsia-300/60 hover:bg-fuchsia-700/50"
                        onClick={handleClerkTest}
                      >
                        Test Clerk
                      </button>
                      <button
                        className="inline-flex items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-800/30 px-4 py-2 text-sm font-medium text-emerald-50 transition hover:border-emerald-300/60 hover:bg-emerald-700/40"
                        onClick={handleAddDemoMessage}
                      >
                        Add demo message
                      </button>
                    </div>
                  </div>
                </Authenticated>
              </div>
            </div>

            <div className="flex h-full flex-col justify-between rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/40 via-neutral-950/40 to-amber-900/20 p-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-amber-200">Convex actions</h2>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Diagnostics</p>
                <p className="text-sm text-neutral-300">
                  Trigger a Convex check to confirm connectivity and observe data flow.
                </p>
              </div>
              <button
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-900/30 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-800/40"
                onClick={handleConvexTest}
              >
                Test Convex
              </button>
            </div>

            <div className="flex h-full flex-col justify-between rounded-2xl border border-sky-500/25 bg-gradient-to-br from-sky-950/40 via-neutral-950/40 to-sky-900/20 p-6">
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-sky-200">Stripe checkout</h2>
                <p className="text-xs uppercase tracking-widest text-neutral-500">Debug console</p>
                <p className="text-sm text-neutral-300">
                  Adjust the quantity and simulate a checkout to log an event for wiring into Stripe later.
                </p>
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-sky-500/30 bg-sky-900/20 p-3">
                  <span className="text-xs uppercase tracking-[0.3em] text-neutral-400">Quantity</span>
                  <div className="flex items-center gap-3">
                    <button
                      aria-label="Decrease quantity"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-500/40 bg-sky-900/40 text-lg text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-800/40"
                      onClick={() => handleQuantityChange(-1)}
                    >
                      −
                    </button>
                    <span className="min-w-[2ch] text-center text-lg font-semibold text-white">{quantity}</span>
                    <button
                      aria-label="Increase quantity"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-500/40 bg-sky-900/40 text-lg text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-800/40"
                      onClick={() => handleQuantityChange(1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500/40 bg-sky-900/30 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:border-sky-300/60 hover:bg-sky-800/40"
                  onClick={handleStripeDebug}
                >
                  Simulate Stripe purchase
                </button>
                <pre className="max-h-36 overflow-y-auto rounded-lg border border-sky-500/20 bg-neutral-950/80 p-3 text-xs leading-relaxed text-sky-100">
{stripeLogText}
                </pre>
              </div>
            </div>
          </section>

          <section className="grid gap-6 bg-neutral-950/60 px-6 py-8 sm:px-10 md:grid-cols-2 xl:py-10">
            <div className="flex h-full flex-col rounded-2xl border border-fuchsia-500/20 bg-neutral-950/70 p-6">
              <header className="mb-4 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-neutral-500">Clerk stream</span>
                <h3 className="text-lg font-semibold text-fuchsia-200">State snapshot</h3>
              </header>
              <pre className="max-h-64 flex-1 overflow-y-auto rounded-xl border border-fuchsia-500/15 bg-neutral-950/80 p-4 text-xs leading-relaxed text-fuchsia-100">
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

            <div className="flex h-full flex-col rounded-2xl border border-amber-500/20 bg-neutral-950/70 p-6">
              <header className="mb-4 flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-neutral-500">Convex stream</span>
                <h3 className="text-lg font-semibold text-amber-200">Data snapshot</h3>
              </header>
              <pre className="max-h-64 flex-1 overflow-y-auto rounded-xl border border-amber-500/15 bg-neutral-950/80 p-4 text-xs leading-relaxed text-amber-100">
                {(() => {
                  if (!isLoaded) return "Loading Clerk state...";
                  if (!isSignedIn) return "Sign in to load Convex data.";
                  if (messages === undefined) return "Loading Convex data...";
                  if (messages.length === 0) return "No messages yet.";
                  return JSON.stringify({ messageCount: messages.length, messages }, null, 2);
                })()}
              </pre>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
