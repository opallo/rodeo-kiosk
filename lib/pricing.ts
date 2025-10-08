export type PriceCatalogEntry = {
  priceId: string;
  eventId: string;
};

const fallbackGeneralAdmissionPriceId = "price_1SCow4LGtZ8BdkwqLaowXCyE";

const generalAdmissionPriceId =
  process.env.NEXT_PUBLIC_STRIPE_GENERAL_ADMISSION_PRICE_ID ?? fallbackGeneralAdmissionPriceId;

export const PRICE_CATALOG = {
  generalAdmission: {
    priceId: generalAdmissionPriceId,
    eventId: "demo-event-123",
  },
} satisfies Record<string, PriceCatalogEntry>;

export const PRICE_ID_ALLOWLIST = new Map(
  Object.values(PRICE_CATALOG).map(({ priceId, eventId }) => [priceId, eventId] as const),
);

export function eventIdForPriceId(priceId: string): string | null {
  return PRICE_ID_ALLOWLIST.get(priceId) ?? null;
}
