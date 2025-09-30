"use client";

import { useState } from "react";
import { Authenticated, Unauthenticated, useMutation, useQuery } from "convex/react"; // added useQuery for convex debug test
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; // added useUser for clerk debug test
import { api } from "@/convex/_generated/api"; // added convex api for debug query
import BuyTicketButton, { BuyTicketButtonDebugEntry } from "@/components/BuyTicketButton";

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser(); // added clerk state for debug output
  const messages = useQuery(api.messages.getForCurrentUser, isSignedIn ? {} : "skip"); // added convex query guarded by auth. Wait for user to be authenicated, then call useQuery to get the messages for the current user.
  const addMessage = useMutation(api.messages.add);
  const [stripeLogs, setStripeLogs] = useState<BuyTicketButtonDebugEntry[]>([]);

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

  const handleStripeDebug = (entry: BuyTicketButtonDebugEntry) => {
    setStripeLogs((prev) => [entry, ...prev].slice(0, 20));
    console.debug("Stripe debug", entry);
  };

  const stripeLogContent = stripeLogs.length
    ? JSON.stringify(stripeLogs, null, 2)
    : "Use the Stripe checkout controls to populate debug logs.";

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-8 text-neutral-100">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10">
        <header className="mb-8 grid gap-2 text-center text-sm uppercase tracking-[0.32em] text-neutral-400">
          <span className="justify-self-center rounded-full border border-neutral-700/70 px-3 py-1 text-[10px] text-neutral-300/80">
            Rodeo Platform
          </span>
          <div className="space-y-1 text-base normal-case tracking-normal text-neutral-300">
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">rodeo-kiosk</h1>
            <p className="text-xs uppercase tracking-[0.28em] text-neutral-500 sm:text-[0.72rem]">
              Clerk · Convex · Stripe debug deck
            </p>
          </div>
        </header>

        <section className="grid min-h-[55vh] grid-cols-1 gap-px border border-neutral-800/60 bg-neutral-800/60 text-sm lg:grid-cols-2">
          <div className="flex flex-col gap-4 bg-neutral-950/70 p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-fuchsia-200">Authentication</h2>
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">Clerk controls</p>
              <p className="text-sm text-neutral-400">
                Sign in with Clerk to unlock debugging utilities.
              </p>
            </div>
            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="inline-flex w-full items-center justify-center gap-2 border border-fuchsia-500/40 bg-fuchsia-900/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-fuchsia-300/60 hover:bg-fuchsia-800/40">
                  Sign in with Clerk
                </button>
              </SignInButton>
            </Unauthenticated>
            <Authenticated>
              <div className="grid gap-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-neutral-500">
                  <span>Current user</span>
                  <UserButton userProfileMode="modal" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="inline-flex items-center justify-center border border-fuchsia-500/30 bg-fuchsia-900/30 px-4 py-2 text-sm font-medium text-white transition hover:border-fuchsia-300/60 hover:bg-fuchsia-800/40"
                    onClick={handleClerkTest}
                  >
                    Test Clerk
                  </button>
                  <button
                    className="inline-flex items-center justify-center border border-emerald-500/30 bg-emerald-900/30 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-800/40"
                    onClick={handleAddDemoMessage}
                  >
                    Add demo message
                  </button>
                </div>
              </div>
            </Authenticated>
          </div>

          <div className="flex flex-col gap-4 bg-neutral-950/70 p-6">
            <header className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">Clerk stream</p>
              <h3 className="text-lg font-semibold text-fuchsia-200">State snapshot</h3>
            </header>
            <pre className="h-56 overflow-y-auto border border-fuchsia-500/20 bg-neutral-950/80 p-4 text-xs leading-relaxed text-fuchsia-100">
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

          <div className="flex flex-col gap-4 bg-neutral-950/70 p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-amber-200">Convex</h2>
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">Action triggers</p>
              <p className="text-sm text-neutral-400">Ping Convex to confirm connectivity and data flow.</p>
            </div>
            <button
              className="inline-flex w-full items-center justify-center border border-amber-500/40 bg-amber-900/30 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-800/40"
              onClick={handleConvexTest}
            >
              Test Convex
            </button>
          </div>

          <div className="flex flex-col gap-4 bg-neutral-950/70 p-6">
            <header className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">Convex stream</p>
              <h3 className="text-lg font-semibold text-amber-200">Data snapshot</h3>
            </header>
            <pre className="h-56 overflow-y-auto border border-amber-500/20 bg-neutral-950/80 p-4 text-xs leading-relaxed text-amber-100">
              {(() => {
                if (!isLoaded) return "Loading Clerk state...";
                if (!isSignedIn) return "Sign in to load Convex data.";
                if (messages === undefined) return "Loading Convex data...";
                if (messages.length === 0) return "No messages yet.";
                return JSON.stringify({ messageCount: messages.length, messages }, null, 2);
              })()}
            </pre>
          </div>

          <div className="flex flex-col gap-4 bg-neutral-950/70 p-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-sky-200">Stripe</h2>
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">Checkout sandbox</p>
              <p className="text-sm text-neutral-400">Launch test checkout and capture debug events.</p>
            </div>
            <BuyTicketButton priceId="price_1SCow4LGtZ8BdkwqLaowXCyE" onDebug={handleStripeDebug} />
          </div>

          <div className="flex flex-col gap-4 bg-neutral-950/70 p-6">
            <header className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">Stripe stream</p>
              <h3 className="text-lg font-semibold text-sky-200">Console output</h3>
            </header>
            <pre className="h-56 overflow-y-auto border border-sky-500/20 bg-neutral-950/80 p-4 text-xs leading-relaxed text-sky-100">
              {stripeLogContent}
            </pre>
          </div>
        </section>
      </div>
    </main>
  );
}
