import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient, sortRates } from "../lib/client.ts";
import type { Rate } from "../lib/client.ts";

/**
 * `POST /v2/pickups/{id}/buy` — book the collection.
 *
 * The step that actually schedules a driver, and the one that costs money.
 * Until this runs, a pickup is a quote and nobody is coming.
 *
 * Carriers identify pickup rates by **carrier and service** rather than by a
 * rate id, which is why this takes those two rather than an id — it is
 * EasyPost's own shape here, not a simplification.
 *
 * `pickup-cancel` exists and carriers charge for a late cancellation, so
 * booking a collection nobody needs is not free either.
 */
const action: ActionDefinition = {
  key: "pickup-buy",
  type: "perform",
  resource: "pickup",
  title: "Book a pickup",
  description:
    "Schedule the collection. This is the step that costs money and sends a driver — until it " +
    "runs, a pickup is only a quote.",
  idempotent: false,
  params: [
    { key: "pickupId", label: "Pickup ID", type: "string", required: true, default: "" },
    {
      key: "carrier",
      label: "Carrier",
      type: "string",
      default: "",
      hint: "Carriers identify pickup rates by carrier and service rather than by id. Leave both " +
        "blank to book the cheapest.",
    },
    { key: "service", label: "Service", type: "string", default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Pickup ID" },
    { key: "status", type: "string", label: "Booking status" },
    { key: "confirmation", type: "string", label: "The carrier's confirmation number" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pickupId = String(p.pickupId ?? "").trim();
    if (!pickupId) throw new Error("`pickupId` is required");

    const client = new EasyPostClient(ctx);
    let carrier = String(p.carrier ?? "").trim();
    let service = String(p.service ?? "").trim();

    if (!carrier || !service) {
      // Fall back to the cheapest quoted rate rather than guessing a service name.
      const pickup = await client.request<{ pickup_rates?: Rate[] }>(
        `/pickups/${encodeURIComponent(pickupId)}`,
      );
      const cheapest = sortRates(pickup?.pickup_rates ?? [])[0];
      if (!cheapest) throw new Error("this pickup has no rates to book");
      carrier = carrier || String(cheapest.carrier ?? "");
      service = service || String(cheapest.service ?? "");
    }

    ctx.log("info", "booking an EasyPost pickup", { pickupId, carrier, service });
    const booked = await client.request<{ status?: string; confirmation?: string }>(
      `/pickups/${encodeURIComponent(pickupId)}/buy`,
      { method: "POST", body: { carrier, service } },
    );
    return booked;
  },
};

export default action;
