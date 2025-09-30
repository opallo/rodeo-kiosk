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
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 py-12 text-neutral-100">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
        <div className="overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950/70 shadow-[0_40px_120px_-60px_rgba(15,15,15,0.8)]">
          <div className="flex flex-col gap-6 border-b border-neutral-800/80 bg-neutral-900/60 px-6 py-10 text-center sm:px-10">
            <p className="mx-auto w-fit rounded-full border border-fuchsia-500/40 bg-fuchsia-900/20 px-3 py-1 text-[10px] uppercase tracking-[0.35em] text-fuchsia-200/80">
              Rodeo Platform
            </p>
            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-[2.6rem]">rodeo-kiosk</h1>
              <p className="mx-auto max-w-xl text-sm text-neutral-300 sm:text-base">
                A consolidated console for Clerk authentication, Convex diagnostics, and Stripe checkout flows.
              </p>
            </div>
          </div>

          <section className="space-y-12 px-6 py-10 sm:px-12">
            <div className="grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-start md:gap-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-semibold text-fuchsia-200">Authentication</h2>
                  <p className="text-xs uppercase tracking-widest text-neutral-500">Clerk access</p>
                  <p className="text-sm text-neutral-300">
                    Sign in with Clerk to unlock the debugging utilities.
                  </p>
                </div>
                <Unauthenticated>
                  <SignInButton mode="modal">
                    <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-fuchsia-500/40 bg-fuchsia-900/30 px-4 py-3 text-sm font-semibold text-white transition hover:border-fuchsia-300/60 hover:bg-fuchsia-800/40">
                      Sign in with Clerk
                    </button>
                  </SignInButton>
                </Unauthenticated>
                <Authenticated>
                  <div className="grid gap-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-900/10 p-5">
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

              <div className="space-y-4 md:pl-4">
                <header className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-widest text-neutral-500">Clerk stream</span>
                  <h3 className="font-semibold text-fuchsia-200">State snapshot</h3>
                </header>
                <pre className="max-h-80 overflow-y-auto rounded-xl border border-fuchsia-500/15 bg-neutral-950/80 p-4 text-xs leading-relaxed text-fuchsia-100">
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
            </div>

            <div className="grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-start md:gap-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-semibold text-amber-200">Convex actions</h2>
                  <p className="text-xs uppercase tracking-widest text-neutral-500">Diagnostics</p>
                  <p className="text-sm text-neutral-300">
                    Trigger a Convex check to confirm connectivity and observe data flow.
                  </p>
                </div>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-900/30 px-4 py-3 text-sm font-semibold text-amber-100 transition hover:border-amber-300/60 hover:bg-amber-800/40"
                  onClick={handleConvexTest}
                >
                  Test Convex
                </button>
              </div>

              <div className="space-y-4 md:pl-4">
                <header className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-widest text-neutral-500">Convex stream</span>
                  <h3 className="font-semibold text-amber-200">Data snapshot</h3>
                </header>
                <pre className="max-h-80 overflow-y-auto rounded-xl border border-amber-500/15 bg-neutral-950/80 p-4 text-xs leading-relaxed text-amber-100">
                  {(() => {
                    if (!isLoaded) return "Loading Clerk state...";
                    if (!isSignedIn) return "Sign in to load Convex data.";
                    if (messages === undefined) return "Loading Convex data...";
                    if (messages.length === 0) return "No messages yet.";
                    return JSON.stringify({ messageCount: messages.length, messages }, null, 2);
                  })()}
                </pre>
              </div>
            </div>

            <div className="grid gap-10 md:grid-cols-[1.05fr_1fr] md:items-start md:gap-12">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h2 className="font-semibold text-sky-200">Stripe checkout</h2>
                  <p className="text-xs uppercase tracking-widest text-neutral-500">Sandbox</p>
                  <p className="text-sm text-neutral-300">
                    Launch Stripe checkout and capture debug events for local flows.
                  </p>
                </div>
                <BuyTicketButton priceId="price_1SCow4LGtZ8BdkwqLaowXCyE" onDebug={handleStripeDebug} />
              </div>

              <div className="space-y-4 md:pl-4">
                <header className="flex flex-col gap-1">
                  <span className="text-xs uppercase tracking-widest text-neutral-500">Stripe stream</span>
                  <h3 className="font-semibold text-sky-200">Console output</h3>
                </header>
                <pre className="max-h-80 overflow-y-auto rounded-xl border border-sky-500/15 bg-neutral-950/80 p-4 text-xs leading-relaxed text-sky-100">
                  {stripeLogContent}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
