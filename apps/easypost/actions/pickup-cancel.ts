import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient } from "../lib/client.ts";

/**
 * `POST /v2/pickups/{id}/cancel` — call the driver off.
 *
 * Worth automating for the same reason the booking is: a collection booked for
 * an order that was cancelled still sends a driver, and carriers charge for a
 * wasted trip. Cancelling late usually costs something too, so the useful
 * version of this runs as soon as the reason disappears rather than on the
 * morning of.
 *
 * Cancelling an already-cancelled pickup is not an error, which is why this is
 * idempotent.
 */
const action: ActionDefinition = {
  key: "pickup-cancel",
  type: "perform",
  resource: "pickup",
  title: "Cancel a pickup",
  description:
    "Call the driver off. A collection booked against a cancelled order still sends one, and " +
    "carriers charge for the wasted trip — so this belongs early, not on the morning.",
  idempotent: true,
  params: [
    { key: "pickupId", label: "Pickup ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "id", type: "string", label: "Pickup ID" },
    { key: "status", type: "string", label: "Status after cancelling" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const pickupId = String(p.pickupId ?? "").trim();
    if (!pickupId) throw new Error("`pickupId` is required");

    ctx.log("info", "cancelling an EasyPost pickup", { pickupId });
    return await new EasyPostClient(ctx).request(
      `/pickups/${encodeURIComponent(pickupId)}/cancel`,
      { method: "POST" },
    );
  },
};

export default action;
