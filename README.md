# Clerk + Convex Quickstart (Next.js App Router)

Follow these five minimal steps to go from the starter kit pieces in this repo to a working "Hello world" page that respects Clerk auth inside Convex.

## Step 1: Configure Clerk (Dashboard)
1. In the Clerk Dashboard, create an application if you don't have one yet.
2. Go to **JWT Templates → New template → Convex** and keep the default name `convex`.
3. Copy the **Issuer URL** for the template (e.g. `https://verb-noun-00.clerk.accounts.dev`). You'll paste it into Convex in the next step.
4. Go to **API Keys** and copy both the **Publishable key** and **Secret key** for later.

## Step 2: Configure Convex (Server)
1. In `convex/auth.config.ts` add the Convex auth provider config:
   ```ts
   export default {
     providers: [
       {
         domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
         applicationID: "convex",
       },
     ],
   };
   ```
2. In the [Convex dashboard](https://dashboard.convex.dev/), set the environment variable `CLERK_JWT_ISSUER_DOMAIN` to the Issuer URL you copied from Clerk.
3. Run `npx convex dev` once so the new auth config is synced to your Convex deployment.

## Step 3: Set Next.js Environment Variables
Create `.env.local` in the project root:
```bash
NEXT_PUBLIC_CONVEX_URL="https://<your-convex-deployment>.convex.cloud"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="<publishable-key-from-clerk>"
CLERK_SECRET_KEY="<secret-key-from-clerk>"
```

## Step 4: Add Clerk Middleware
1. Ensure `middleware.ts` exports Clerk's middleware (replace the contents if needed):
   ```ts
   import { clerkMiddleware } from "@clerk/nextjs/server";

   export default clerkMiddleware();

   export const config = { 
      matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
      ]
   };
   ```
2. Restart the dev server after editing middleware so Next.js picks up the change.

## Step 5: Wrap Providers and Smoke Test the App
1. Create `components/ConvexClientProvider.tsx`:
   ```tsx
   "use client";

   import { ReactNode } from "react";
   import { ConvexReactClient } from "convex/react";
   import { ConvexProviderWithClerk } from "convex/react-clerk";
   import { useAuth } from "@clerk/nextjs";

   const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

   export default function ConvexClientProvider({ children }: { children: ReactNode }) {
     return (
       <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
         {children}
       </ConvexProviderWithClerk>
     );
   }
   ```
2. Wrap the App Router layout in `app/layout.tsx`:
   ```tsx
   import "./globals.css";
   import { ClerkProvider } from "@clerk/nextjs";
   import ConvexClientProvider from "@/components/ConvexClientProvider";

   export default function RootLayout({ children }: { children: React.ReactNode }) {
     return (
       <html lang="en">
         <body>
           <ClerkProvider>
             <ConvexClientProvider>{children}</ConvexClientProvider>
           </ClerkProvider>
         </body>
       </html>
     );
   }
   ```
3. Replace the default page at `app/page.tsx` to verify the integration:
   ```tsx
   "use client";

   import { Authenticated, Unauthenticated } from "convex/react";
   import { SignInButton, UserButton } from "@clerk/nextjs";

   export default function Home() {
     return (
       <main>
         <Authenticated>
           <UserButton />
           <p>Hello from Convex with Clerk auth!</p>
         </Authenticated>
         <Unauthenticated>
           <SignInButton mode="modal">Sign in</SignInButton>
         </Unauthenticated>
       </main>
     );
   }
   ```
4. Run the dev server (`pnpm dev`, `npm run dev`, or `yarn dev`). Sign in with Clerk, and the authenticated block will render once Convex validates the session.
