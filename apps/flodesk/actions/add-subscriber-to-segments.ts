import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

interface Input {
  idOrEmail: string;
  segmentIds: string[];
}

/**
 * `POST /v1/subscribers/{id_or_email}/segments`.
 *
 * `idempotent: true` — segment membership is a set. Adding a subscriber to a
 * segment they already belong to leaves the set unchanged, so a replay is safe.
 *
 * Note this endpoint does NOT create the subscriber: it answers 404 for an
 * unknown id or address. Use Create or Update Subscriber (which accepts
 * `segment_ids` directly) when the subscriber may not exist yet.
 */
const addSubscriberToSegments: ActionDefinition<Input> = {
  key: "add-subscriber-to-segments",
  type: "perform",
  resource: "subscriber",
  title: "Add Subscriber to Segments",
  description:
    "Add an existing subscriber to one or more segments. The subscriber must already exist — this does not create one.",
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
      { method: "POST", body: { segment_ids: input.segmentIds } },
    );
  },
};

export default addSubscriberToSegments;
