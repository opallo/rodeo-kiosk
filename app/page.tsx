"use client"

import { Authenticated, Unauthenticated, useQuery } from "convex/react"; // added useQuery for convex debug test
import { SignInButton, UserButton, useUser } from "@clerk/nextjs"; // added useUser for clerk debug test
import { api } from "@/convex/_generated/api"; // added convex api for debug query

export default function Home() {
  const { user, isLoaded, isSignedIn } = useUser(); // added clerk state for debug output
  const messages = useQuery(api.messages.getForCurrentUser, isSignedIn ? {} : "skip"); // added convex query guarded by auth. Wait for user to be authenicated, then call useQuery to get the messages for the current user.

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
    <main>

      {/* title */}
      <div className="flex justify-center mt-25 font-black text-xl">
        rodeo-kiosk
      </div>

      {/* input section */}
      <section className="flex justify-center max-w-full max-h-75 mt-12 mx-[10%] bg-neutral-800 drop-shadow-md rounded-md p-4">

        {/* container */}
        <div className="flex justify-center align-top min-w-1/2 drop-shadow-md bg-fuchsia-950/20 rounded-md p-12 overflow-y-auto">

          {/* unauthenticated */}
          <Unauthenticated>

            {/* sign-in button */}
            <SignInButton mode="modal">
              <button className="text-white bg-fuchsia-800 px-6 py-3 rounded-md drop-shadow-md cursor-pointer hover:bg-fuchsia-950">
                Sign in with Clerk
              </button>
            </SignInButton>
          </Unauthenticated>

          {/* authenticated */}
          <Authenticated>
            <div className="flex flex-col gap-2 justify-center items-center">

              {/* user button */}
              <UserButton userProfileMode="modal">
              </UserButton>

              {/* test clerk button */}
              <button color="black" className="text-white bg-fuchsia-800 px-6 py-3 rounded-md drop-shadow-md cursor-pointer hover:bg-fuchsia-950" onClick={handleClerkTest}>
                test clerk
              </button>
            </div>
          </Authenticated>
        </div>

        {/* container */}
        <div className="flex justify-center min-w-1/2 drop-shadow-md bg-amber-950/20 rounded-md overflow-y-auto p-12">

          {/* button */}
          <button color="black" className="text-white bg-amber-800 hover:bg-amber-950 px-6 py-3 rounded-md drop-shadow-md cursor-pointer" onClick={handleConvexTest}>
            test convex
          </button>
        </div>
      </section>

      {/* debug */}
      <section className="flex flex-row grid-cols-2 gap-3 justify-center max-w-full max-h-75 mt-12 mx-[10%] bg-neutral-800 drop-shadow-md rounded-md p-4">

        <div className="flex justify-start align-top min-w-1/2 drop-shadow-md bg-fuchsia-950/20 rounded-md p-12 overflow-y-auto">
          <pre className="whitespace-pre-wrap text-xs">{/* added clerk debug output */}
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

        <div className="flex justify-start min-w-1/2 drop-shadow-md bg-amber-950/20 rounded-md overflow-y-auto p-12">

          {/* added convex debug output */}
          <pre className="whitespace-pre-wrap text-xs">
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
    </main >
  )
}
