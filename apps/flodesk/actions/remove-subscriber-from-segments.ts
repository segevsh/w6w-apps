import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
  segmentIds: string[];
}

/**
 * `DELETE /v1/subscribers/{id_or_email}/segments` — note this DELETE carries a
 * JSON **request body** (`segment_ids`), which is unusual but is exactly what
 * Flodesk documents. `FlodeskClient` sends a body on any method, so no special
 * casing is needed.
 *
 * `idempotent: true` — removing a subscriber from a segment they are not in
 * converges on the same state, so a replay is safe.
 *
 * This removes segment MEMBERSHIP only. It does not unsubscribe them (see
 * Unsubscribe Subscriber) and does not delete the subscriber — Flodesk publishes
 * no subscriber-delete endpoint at all.
 */
const removeSubscriberFromSegments: ActionDefinition<Input> = {
  key: "remove-subscriber-from-segments",
  type: "perform",
  resource: "subscriber",
  title: "Remove Subscriber from Segments",
  description:
    "Remove a subscriber from one or more segments. Affects segment membership only — it neither unsubscribes nor deletes the subscriber.",
  idempotent: true,
  params: [
    {
      key: "idOrEmail",
      label: "Subscriber ID or email",
      type: "string",
      required: true,
      placeholder: "name@email.com",
    },
    {
      key: "segmentIds",
      label: "Segment IDs",
      type: "json",
      required: true,
      hint: 'JSON array of segment ids, e.g. `["61b...","62c..."]`.',
    },
  ],
  output: [{ key: "subscriber", type: "object", label: "Subscriber, with updated segments" }],

  execute(input, ctx) {
    if (!Array.isArray(input.segmentIds) || input.segmentIds.length === 0) {
      throw new Error("`segmentIds` must be a non-empty JSON array of segment ids");
    }
    return new FlodeskClient(ctx).request(
      `/subscribers/${FlodeskClient.seg(input.idOrEmail)}/segments`,
      { method: "DELETE", body: { segment_ids: input.segmentIds } },
    );
  },
};

export default removeSubscriberFromSegments;
