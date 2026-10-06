import { define, idField } from "../lib/actions.ts";
import { call, seg } from "../lib/client.ts";

const STATUSES = [
  "draft",
  "sent",
  "read",
  "accepted",
  "refused",
  "expired",
  "advanced",
  "partialinvoiced",
  "invoiced",
  "cancelled",
];

/** `PUT /estimates/{id}/status` (scope `estimates.write`). */
export default define(
  {
    key: "estimate-status-update",
    type: "perform",
    title: "Update Estimate Status",
    description:
      "Move an estimate to another status (e.g. sent, accepted, refused). Needs the `estimates.write` scope.",
  },
  [
    idField("Estimate ID"),
    { key: "status", label: "Status", options: STATUSES, required: true },
  ],
  [{ key: "estimate", type: "json", label: "The updated estimate" }],
  async (input, ctx) => {
    if (!STATUSES.includes(String(input.status))) {
      throw new Error(`status must be one of: ${STATUSES.join(", ")}`);
    }
    const estimate = await call(ctx, `/estimates/${seg(input.id)}/status`, {
      method: "PUT",
      body: { status: input.status },
    });
    return { estimate: estimate ?? { id: input.id, status: input.status } };
  },
  true,
);
