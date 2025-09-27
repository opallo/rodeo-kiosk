"use client"

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <main>

      {/* title */}
      <div className="flex justify-center mt-25 font-black text-xl">
        rodeo-kiosk
      </div>

      {/* section */}
      <section className="flex justify-center max-w-full max-h-75 mt-12 mx-[10%] bg-neutral-800 drop-shadow-md rounded-md p-4">

        {/* container */}
        <div className="flex justify-center min-w-sm drop-shadow-md bg-neutral-600 rounded-md p-12">

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
              <button color="black" className="text-white bg-fuchsia-800 px-6 py-3 rounded-md drop-shadow-md cursor-pointer hover:bg-fuchsia-950">
                test clerk
              </button>
            </div>
          </Authenticated>
        </div>
      </section>
      <section className="flex justify-center max-w-full max-h-75 mt-12 mx-[10%] bg-neutral-800 drop-shadow-md rounded-md p-4">

        {/* container */}
        <div className="flex justify-center min-w-sm drop-shadow-md bg-neutral-600 rounded-md p-12">

          {/* button */}
          <button color="black" className="text-white bg-amber-800 hover:bg-amber-950 px-6 py-3 rounded-md drop-shadow-md cursor-pointer">
            test convex
          </button>
        </div>
      </section>

      {/* debug */}
      <section className="flex flex-row grid-cols-2 gap-3 justify-center max-w-full max-h-75 mt-12 mx-[10%] bg-neutral-800 drop-shadow-md rounded-md p-4">
        <div className="flex justify-start align-top min-w-1/2 drop-shadow-md bg-neutral-900 rounded-md p-12 overflow-y-auto">
          clerk debug
        </div>
        <div className="flex justify-start min-w-1/2 drop-shadow-md bg-neutral-900 rounded-md overflow-y-auto p-12">
          convex debug
        </div>
      </section>
    </main >
  )
}
