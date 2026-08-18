import type { ActionDefinition } from "@w6w/types";
import { EasyPostClient } from "../lib/client.ts";

/**
 * `GET /v2/trackers/{id}` — where is it now?
 *
 * ## Read `status`, and know what `unknown` means
 *
 * The values are `unknown`, `pre_transit`, `in_transit`, `out_for_delivery`,
 * `delivered`, `available_for_pickup`, `return_to_sender`, `failure` and
 * `cancelled`.
 *
 * **`unknown` is the one that misleads.** It does not mean lost — for a label
 * bought an hour ago it means the carrier has not scanned the parcel yet, which
 * is entirely normal until it is handed over. A workflow that alerts on
 * `unknown` alerts on every shipment it creates.
 *
 * The two worth acting on are **`return_to_sender`** (the parcel is coming
 * back, and the customer does not know) and **`failure`** (the carrier has
 * given up). Both are silent otherwise — nobody is told, and the order simply
 * never arrives.
 *
 * `delivered` is returned as its own boolean because it is the branch most
 * workflows want, and `stalled` reports a parcel that has not moved in a week,
 * computed from the tracking history rather than the status, since no status
 * says "stuck".
 */
const STALLED_DAYS = 7;

const action: ActionDefinition = {
  key: "tracker-get",
  type: "read",
  resource: "tracker",
  title: "Get tracking status",
  description:
    "Where a parcel is. `unknown` means not yet scanned, not lost — the ones worth acting on " +
    "are `return_to_sender` and `failure`, and both are otherwise silent.",
  params: [
    { key: "trackerId", label: "Tracker ID", type: "string", required: true, default: "" },
  ],
  output: [
    { key: "status", type: "string", label: "Where the parcel is" },
    { key: "delivered", type: "boolean", label: "Whether it arrived" },
    { key: "needsAttention", type: "boolean", label: "Returning to sender, or failed" },
    { key: "stalled", type: "boolean", label: "No movement in a week" },
    { key: "est_delivery_date", type: "string", label: "The carrier's estimate" },
    { key: "public_url", type: "string", label: "A page a customer can be sent to" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const trackerId = String(p.trackerId ?? "").trim();
    if (!trackerId) throw new Error("`trackerId` is required");

    const tracker = await new EasyPostClient(ctx).request<{
      status?: string;
      tracking_details?: Array<{ datetime?: string }>;
    }>(`/trackers/${encodeURIComponent(trackerId)}`);

    const status = String(tracker?.status ?? "unknown");
    const details = tracker?.tracking_details ?? [];
    const last = details[details.length - 1]?.datetime;
    // No status says "stuck", so it is computed from the last scan.
    const stalled = Boolean(
      last && status !== "delivered" &&
        Date.now() - Date.parse(last) > STALLED_DAYS * 86_400_000,
    );

    return {
      ...tracker,
      delivered: status === "delivered",
      needsAttention: status === "return_to_sender" || status === "failure",
      stalled,
    };
  },
};

export default action;
