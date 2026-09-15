import type { ActionDefinition } from "@w6w/types";
import { flatten, type JsonApiDocument, NationBuilderClient } from "../lib/client.ts";

interface Input {
  donationId: string;
}

/** `GET /api/v2/donations/{id}` — confirmed against the vendor's OpenAPI spec. */
const donationGet: ActionDefinition<Input> = {
  key: "donation-get",
  type: "read",
  resource: "donation",
  title: "Get Donation",
  description: "Fetch a donation by id.",
  params: [{ key: "donationId", label: "Donation ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "Donation ID" },
    { key: "amount_in_cents", type: "number", label: "Amount (cents)" },
  ],

  async execute(input, ctx) {
    const res = await new NationBuilderClient(ctx).request<JsonApiDocument>(
      `/donations/${encodeURIComponent(input.donationId)}`,
    );
    return flatten(Array.isArray(res.data) ? undefined : res.data);
  },
};

export default donationGet;
