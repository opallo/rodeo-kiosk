/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as messages from "../messages.js";
import type * as purchases from "../purchases.js";
import type * as stripeEvents from "../stripeEvents.js";
import type * as stripeFulfillment from "../stripeFulfillment.js";
import type * as tickets from "../tickets.js";
import type * as ticketsPublic from "../ticketsPublic.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  messages: typeof messages;
  purchases: typeof purchases;
  stripeEvents: typeof stripeEvents;
  stripeFulfillment: typeof stripeFulfillment;
  tickets: typeof tickets;
  ticketsPublic: typeof ticketsPublic;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
