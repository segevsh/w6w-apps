import type { ActionDefinition } from "@w6w/types";
import { bumpIdParam, modeParam } from "../lib/params.ts";
import { encodeId, ThriveCartClient } from "../lib/client.ts";

/** `GET /bumps/:bump_id` — one bump offer's full definition. */
interface Input {
  bumpId: string;
  mode?: string;
}

const bumpGet: ActionDefinition<Input> = {
  key: "bump-get",
  type: "read",
  resource: "bump",
  title: "Get Bump Offer",
  description: "Fetch one order-bump offer by ID.",
  params: [bumpIdParam, modeParam],
  output: [
    { key: "product_id", type: "string", label: "Parent product ID" },
    { key: "product_name", type: "string", label: "Parent product name" },
    { key: "bump_id", type: "string", label: "Bump ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "slug", type: "string", label: "Slug" },
    { key: "status", type: "string", label: "Status code" },
    { key: "statusString", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type code" },
    { key: "typeString", type: "string", label: "Type" },
    { key: "payment_currency", type: "string", label: "Currency" },
    { key: "url", type: "string", label: "Checkout URL" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).get(`/bumps/${encodeId(input.bumpId)}`, {
      mode: input.mode,
    });
  },
};

export default bumpGet;
