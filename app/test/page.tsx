"use client"

import { useState } from "react";
import { Authenticated, Unauthenticated, useQuery } from "convex/react"; // added useQuery for convex debug test
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; // added useUser for clerk debug test
import { api } from "@/convex/_generated/api"; // added convex api for debug query
import { useMutation } from "convex/react";

export default function Home() {

  const { user, isLoaded, isSignedIn } = useUser(); // added clerk state for debug output
  const messages = useQuery(api.messages.getForCurrentUser, isSignedIn ? {} : "skip"); // added convex query guarded by auth. Wait for user to be authenicated, then call useQuery to get the messages for the current user.

  const addMessage = useMutation(api.messages.add);
  const [quantity, setQuantity] = useState(1);
  const handleAddDemoMessage = () => {
    addMessage({ body: "demo-" + Date.now() });
  }

  const handleClerkTest = () => { // added handler to log clerk debug info
    console.debug("Clerk debug", {
      isLoaded,
      isSignedIn,
      userId: user?.id,
      email: user?.primaryEmailAddress?.emailAddress,
    });
  };

  const handleConvexTest = () => { // added handler to log convex debug info
    console.debug("Convex debug", {
      isSignedIn,
      messageCount: messages?.length ?? "n/a",
      messages,
    });
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handlePurchase = () => {
    console.debug("Ticket purchase", { quantity });
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

          <section className="grid divide-neutral-800/80 md:grid-cols-2 md:divide-x">
            <div className="space-y-6 px-6 py-8 sm:px-10">
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

            <div className="space-y-6 border-t border-neutral-800/80 px-6 py-8 sm:px-10 md:border-t-0">
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
          </section>

          <section className="grid divide-y divide-neutral-800/80 md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="space-y-4 px-6 py-8 sm:px-10">
              <header className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-neutral-500">Clerk stream</span>
                <h3 className="font-semibold text-fuchsia-200">State snapshot</h3>
              </header>
              <pre className="max-h-64 overflow-y-auto rounded-xl border border-fuchsia-500/15 bg-neutral-950/80 p-4 text-xs leading-relaxed text-fuchsia-100">
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

            <div className="space-y-4 px-6 py-8 sm:px-10">
              <header className="flex flex-col gap-1">
                <span className="text-xs uppercase tracking-widest text-neutral-500">Convex stream</span>
                <h3 className="font-semibold text-amber-200">Data snapshot</h3>
              </header>
              <pre className="max-h-64 overflow-y-auto rounded-xl border border-amber-500/15 bg-neutral-950/80 p-4 text-xs leading-relaxed text-amber-100">
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

          <section className="border-t border-neutral-800/80 bg-neutral-900/40 px-6 py-10 sm:px-10">
            <div className="mx-auto max-w-3xl space-y-6 rounded-2xl border border-sky-500/20 bg-neutral-950/60 p-6 shadow-inner">
              <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-sky-400/70">Ticketing sandbox</span>
                  <h3 className="mt-1 text-xl font-semibold text-sky-100">Purchase mock</h3>
                  <p className="text-sm text-neutral-400">
                    Adjust the quantity to simulate a Rodeo ticket purchase flow.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/30 bg-sky-900/30 px-3 py-1 text-xs font-medium text-sky-100">
                  Debug Mode
                </div>
              </header>

              <div className="grid gap-4 rounded-xl border border-sky-500/20 bg-neutral-900/40 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <div className="flex items-center gap-2 text-neutral-300">
                  <span className="text-xs uppercase tracking-widest text-neutral-500">Quantity</span>
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
                <div className="sm:text-right">
                  <button
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-900/40 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-800/50 sm:w-auto"
                    onClick={handlePurchase}
                  >
                    Complete purchase
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
