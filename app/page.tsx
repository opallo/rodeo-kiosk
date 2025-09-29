"use client"

import { Authenticated, Unauthenticated, useQuery } from "convex/react"; // added useQuery for convex debug test
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; // added useUser for clerk debug test
import { api } from "@/convex/_generated/api"; // added convex api for debug query
import { useMutation } from "convex/react";
import { redirect } from "next/navigation";

export default function Home() {
  if(process.env.NODE_ENV === "development") redirect("/test");
  const { user, isLoaded, isSignedIn } = useUser(); // added clerk state for debug output
  const messages = useQuery(api.messages.getForCurrentUser, isSignedIn ? {} : "skip"); // added convex query guarded by auth. Wait for user to be authenicated, then call useQuery to get the messages for the current user.

  const addMessage = useMutation(api.messages.add);
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

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-16">
        <header className="flex flex-col items-center gap-3 text-center">
          <p className="rounded-full border border-fuchsia-600/40 bg-fuchsia-900/20 px-4 py-1 text-xs uppercase tracking-[0.3em] text-fuchsia-200/80">
            Rodeo Platform
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">rodeo-kiosk</h1>
          <p className="max-w-2xl text-sm text-neutral-300 md:text-base">
            Streamlined access to your Clerk and Convex diagnostics in one tidy control surface.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="flex flex-col gap-6 rounded-2xl border border-fuchsia-500/20 bg-neutral-900/60 p-8 shadow-xl shadow-fuchsia-900/20 backdrop-blur">
            <h2 className="text-lg font-medium text-fuchsia-200">Authentication</h2>
            <p className="text-sm text-neutral-300">
              Sign in with Clerk to unlock interactive debugging actions.
            </p>
            <Unauthenticated>
              <SignInButton mode="modal">
                <button className="group inline-flex items-center justify-center gap-2 rounded-full border border-fuchsia-500/60 bg-fuchsia-800/80 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-fuchsia-300/80 hover:bg-fuchsia-700">
                  <span>Sign in with Clerk</span>
                </button>
              </SignInButton>
            </Unauthenticated>
            <Authenticated>
              <div className="flex flex-col items-center gap-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-900/20 p-6">
                <UserButton userProfileMode="modal" />
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    className="rounded-full border border-fuchsia-500/50 bg-fuchsia-700 px-5 py-2 text-sm font-medium text-white transition hover:border-fuchsia-300 hover:bg-fuchsia-600"
                    onClick={handleClerkTest}
                  >
                    Test Clerk
                  </button>
                  <button
                    className="rounded-full border border-emerald-500/50 bg-emerald-700 px-5 py-2 text-sm font-medium text-white transition hover:border-emerald-300 hover:bg-emerald-600"
                    onClick={handleAddDemoMessage}
                  >
                    Add demo message
                  </button>
                </div>
              </div>
            </Authenticated>
          </div>

          <div className="flex flex-col gap-6 rounded-2xl border border-amber-500/20 bg-neutral-900/60 p-8 shadow-xl shadow-amber-900/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-amber-200">Convex actions</h2>
              <span className="text-xs uppercase tracking-wide text-amber-200/70">Diagnostics</span>
            </div>
            <p className="text-sm text-neutral-300">
              Trigger test writes to quickly validate Convex connectivity.
            </p>
            <button
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-amber-500/50 bg-amber-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-300 hover:bg-amber-600"
              onClick={handleConvexTest}
            >
              Test convex
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-fuchsia-500/20 bg-neutral-900/60 p-6 shadow-lg shadow-fuchsia-900/15 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-fuchsia-200">Clerk state</h3>
              <span className="text-xs uppercase tracking-wide text-neutral-400">Live</span>
            </div>
            <pre className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-fuchsia-500/10 bg-neutral-950/60 p-4 text-xs text-fuchsia-100">
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

          <div className="rounded-2xl border border-amber-500/20 bg-neutral-900/60 p-6 shadow-lg shadow-amber-900/15 backdrop-blur">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-amber-200">Convex data</h3>
              <span className="text-xs uppercase tracking-wide text-neutral-400">Live</span>
            </div>
            <pre className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-amber-500/10 bg-neutral-950/60 p-4 text-xs text-amber-100">
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
    </main>
  );
}
