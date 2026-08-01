import type { ActionDefinition } from "@w6w/types";
import { regionFromConnection, request } from "../lib/client.ts";

/**
 * `DELETE /customers/:id` — permanently delete a person. Verified 2026-08-01
 * against the official `customerio-node` SDK (`TrackClient.destroy`).
 *
 * This does NOT suppress the person: they can be re-added later by a
 * subsequent `identify` call. Customer.io's Track API has a separate
 * suppress/unsuppress pair (`POST /customers/:id/suppress` /
 * `/unsuppress`) for permanent opt-out, which this app does not implement —
 * out of scope for this app's action set.
 *
 * `idempotent: true` — deleting an id that is already gone is the same
 * end state as deleting it the first time; a host retry is safe.
 */
const del: ActionDefinition = {
  key: "delete",
  type: "perform",
  resource: "person",
  title: "Delete Person",
  description: "Permanently delete a person. Does not suppress them — they can be re-added later.",
  idempotent: true,
  params: [
    {
      key: "personId",
      label: "Person ID",
      type: "string",
      required: true,
      hint: "The person's unique identifier.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Customer.io" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const personId = typeof p.personId === "string" ? p.personId.trim() : "";
    if (!personId) throw new Error("`personId` is required");

    ctx.log("info", "Customer.io delete person", { personId });
    const region = regionFromConnection(ctx.connection);
    return await request(ctx, region, "DELETE", `/customers/${encodeURIComponent(personId)}`);
  },
};

export default del;
