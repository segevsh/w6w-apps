import type { ActionDefinition } from "@w6w/types";
import { regionFromConnection, request } from "../lib/client.ts";

interface Input {
  segmentId: string;
  personIds: string[];
  idType?: string;
}

/**
 * `POST /segments/:id/remove_customers` — remove people from a manual
 * segment. Verified 2026-08-01 against the official `customerio-node` SDK
 * (`TrackClient.removeCustomersFromSegment`) — same shape as `add-to-segment`.
 *
 * `idempotent: true` — removing an id that is already absent from the
 * segment is a no-op; a host retry is safe.
 */
const segmentRemove: ActionDefinition<Input> = {
  key: "remove-from-segment",
  type: "perform",
  resource: "segment",
  title: "Remove Person from Segment",
  description: "Remove one or more people from a manual segment.",
  idempotent: true,
  params: [
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      required: true,
      hint: "The manual segment's id.",
    },
    {
      key: "personIds",
      label: "Person IDs",
      type: "array",
      item: { type: "string" },
      required: true,
      hint: "Identifiers of the people to remove (1-1,000). Must match the ID type selected below.",
    },
    {
      key: "idType",
      label: "ID Type",
      type: "select",
      default: "id",
      hint: "Which identifier kind the Person IDs above are.",
      options: [
        { value: "id", label: "ID" },
        { value: "email", label: "Email" },
        { value: "cio_id", label: "Customer.io ID" },
      ],
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Customer.io" }],

  async execute(input, ctx) {
    const segmentId = typeof input.segmentId === "string" ? input.segmentId.trim() : "";
    if (!segmentId) throw new Error("`segmentId` is required");
    if (!Array.isArray(input.personIds) || input.personIds.length === 0) {
      throw new Error("`personIds` must be a non-empty array");
    }
    if (input.personIds.length > 1000) {
      throw new Error(
        `\`personIds\` carries ${input.personIds.length} items; Customer.io accepts at most 1,000`,
      );
    }

    const idType = typeof input.idType === "string" && input.idType ? input.idType : undefined;
    const query = idType && idType !== "id" ? `?id_type=${encodeURIComponent(idType)}` : "";

    ctx.log("info", "Customer.io remove from segment", {
      segmentId,
      count: input.personIds.length,
    });
    const region = regionFromConnection(ctx.connection);
    return await request(
      ctx,
      region,
      "POST",
      `/segments/${encodeURIComponent(segmentId)}/remove_customers${query}`,
      { ids: input.personIds },
    );
  },
};

export default segmentRemove;
