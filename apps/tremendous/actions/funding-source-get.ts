import type { ActionDefinition } from "@w6w/types";
import { TremendousClient } from "../lib/client.ts";

/**
 * `GET /funding_sources/{id}` — one funding source, with its current (not
 * cached) `available_amount`.
 *
 * Accepts a real funding source ID OR the case-insensitive magic keywords
 * `BALANCE` (the organization's balance) and `INVOICE` (its active commercial
 * invoice funding source, Enterprise-only) — same as `order-create`'s
 * `fundingSourceId` field.
 */
interface Input {
  id: string;
}

const fundingSourceGet: ActionDefinition<Input> = {
  key: "funding-source-get",
  type: "read",
  resource: "funding-source",
  title: "Get Funding Source",
  description: "Retrieve one funding source by ID, or the keyword BALANCE or INVOICE.",
  params: [
    {
      key: "id",
      label: "Funding source ID",
      type: "string",
      required: true,
      hint:
        "A funding source ID from List Funding Sources, or BALANCE / INVOICE (case-insensitive).",
    },
  ],
  output: [{ key: "funding_source", type: "object", label: "The funding source" }],

  async execute(input, ctx) {
    const body = await new TremendousClient(ctx).json<{ funding_source: unknown }>(
      `/funding_sources/${encodeURIComponent(input.id)}`,
    );
    return body.funding_source;
  },
};

export default fundingSourceGet;
