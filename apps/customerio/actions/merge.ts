import type { ActionDefinition } from "@w6w/types";
import { regionFromConnection, request } from "../lib/client.ts";

interface Input {
  primaryIdType: string;
  primaryId: string;
  secondaryIdType: string;
  secondaryId: string;
}

const ID_TYPES = ["id", "email", "cio_id"];

/**
 * `POST /merge_customers` — merge two person profiles. Verified 2026-08-01
 * against the official `customerio-node` SDK (`TrackClient.mergeCustomers`):
 * body `{ primary: { [type]: id }, secondary: { [type]: id } }`.
 *
 * The primary profile survives; the secondary is permanently deleted and its
 * attributes (only those unset on the primary), most recent 30 days of event
 * history, manual segment memberships, and message delivery history are
 * merged into the primary. Events merged from the secondary cannot trigger
 * campaigns. This is irreversible.
 *
 * `idempotent: false` — the secondary profile no longer exists after a
 * successful merge, so retrying targets an id Customer.io can no longer
 * resolve; a retry is not safe to assume as a no-op.
 */
const merge: ActionDefinition<Input> = {
  key: "merge",
  type: "perform",
  resource: "person",
  title: "Merge Person Profiles",
  description:
    "Merge a secondary (duplicate) person into a primary person. The secondary is permanently deleted.",
  idempotent: false,
  params: [
    {
      key: "primaryIdType",
      label: "Primary ID Type",
      type: "select",
      required: true,
      default: "id",
      row: "primary",
      options: [
        { value: "id", label: "ID" },
        { value: "email", label: "Email" },
        { value: "cio_id", label: "Customer.io ID" },
      ],
    },
    {
      key: "primaryId",
      label: "Primary ID",
      type: "string",
      required: true,
      row: "primary",
      hint: "Identifier of the profile that survives the merge.",
    },
    {
      key: "secondaryIdType",
      label: "Secondary ID Type",
      type: "select",
      required: true,
      default: "id",
      row: "secondary",
      options: [
        { value: "id", label: "ID" },
        { value: "email", label: "Email" },
        { value: "cio_id", label: "Customer.io ID" },
      ],
    },
    {
      key: "secondaryId",
      label: "Secondary ID",
      type: "string",
      required: true,
      row: "secondary",
      hint: "Identifier of the duplicate profile to merge in and delete.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Customer.io" }],

  async execute(input, ctx) {
    const primaryId = typeof input.primaryId === "string" ? input.primaryId.trim() : "";
    const secondaryId = typeof input.secondaryId === "string" ? input.secondaryId.trim() : "";
    if (!primaryId) throw new Error("`primaryId` is required");
    if (!secondaryId) throw new Error("`secondaryId` is required");

    const primaryIdType = ID_TYPES.includes(input.primaryIdType) ? input.primaryIdType : "id";
    const secondaryIdType = ID_TYPES.includes(input.secondaryIdType) ? input.secondaryIdType : "id";

    ctx.log("info", "Customer.io merge", { primaryId, secondaryId });
    const region = regionFromConnection(ctx.connection);
    return await request(ctx, region, "POST", "/merge_customers", {
      primary: { [primaryIdType]: primaryId },
      secondary: { [secondaryIdType]: secondaryId },
    });
  },
};

export default merge;
