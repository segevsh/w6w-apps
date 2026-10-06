import type { ActionDefinition } from "@w6w/types";
import { encodeId, OnePageClient } from "../lib/client.ts";

interface Input {
  dealId: string;
}

/** `GET /deals/{deal_id}` — one deal. */
const getDeal: ActionDefinition<Input> = {
  key: "get-deal",
  type: "read",
  resource: "deal",
  title: "Get Deal",
  description: "Fetch one deal: amount, months, stage, status, dates, owner and custom fields.",
  params: [{ key: "dealId", label: "Deal ID", type: "string", required: true }],
  output: [{ key: "deal", type: "object", label: "The deal" }],

  async execute(input, ctx) {
    return await new OnePageClient(ctx).data(`/deals/${encodeId(input.dealId)}`);
  },
};

export default getDeal;
