import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, regionFromConnection, request } from "../lib/client.ts";

/**
 * `PUT /customers/:id` — create a person, or update their attributes if they
 * already exist (upsert). Verified 2026-08-01 against the official
 * `customerio-node` SDK (`TrackClient.identify`): the request body is the
 * `attributes` object itself, sent as-is — there is no wrapper key.
 *
 * `personId` is the person's id, email, or (to change an existing
 * identifier) `cio_<cio_id>`. `email` is required among the attributes if you
 * intend to send email messages; `created_at` is required for date-based
 * segmentation — both are ordinary attribute keys, not special params.
 *
 * `idempotent: true` — a PUT with the same id and attributes is a pure
 * upsert; a host retry re-applies the same state rather than creating a
 * duplicate or double-firing a side effect.
 */
const identify: ActionDefinition = {
  key: "identify",
  type: "perform",
  resource: "person",
  title: "Identify Person",
  description: "Create a person, or update their attributes if they already exist (upsert).",
  idempotent: true,
  params: [
    {
      key: "personId",
      label: "Person ID",
      type: "string",
      required: true,
      hint: "The person's id or email. To change an existing identifier, use `cio_<cio_id>`.",
    },
    {
      key: "attributes",
      label: "Attributes",
      type: "json",
      hint:
        'Free-form profile attributes, e.g. { "email": "a@b.com", "plan": "pro" }. `email` is ' +
        "required to send email messages; `created_at` (unix timestamp) is required for " +
        "date-based segmentation.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Accepted by Customer.io" }],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const personId = typeof p.personId === "string" ? p.personId.trim() : "";
    if (!personId) throw new Error("`personId` is required");

    const attributes = parseJsonParam(p.attributes) ?? {};

    ctx.log("info", "Customer.io identify", { personId });
    const region = regionFromConnection(ctx.connection);
    return await request(
      ctx,
      region,
      "PUT",
      `/customers/${encodeURIComponent(personId)}`,
      attributes,
    );
  },
};

export default identify;
