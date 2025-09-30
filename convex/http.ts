// Notes for developer:
// - Stripe CLI: stripe listen --events checkout.session.completed --forward-to https://<DEPLOYMENT>.convex.site/stripe.
// - Stripe webhook secrets live in Convex env vars.

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const router = httpRouter();

router.route({
  path: "/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing Stripe signature", { status: 400 });
    }

    const payload = await request.text();

    try {
      await ctx.runAction(internal.stripe.fulfill, { signature, payload });
      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Stripe webhook failure", error);
      return new Response("Webhook error", { status: 400 });
    }
  }),
});

export default router;
