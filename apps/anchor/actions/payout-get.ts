import type { ActionDefinition } from "@w6w/types";
import { AnchorClient, encodeId } from "../lib/client.ts";

/** `GET /payouts/{id}` — Anchor operation `getPayout`. */
interface Input {
  id: string;
}

const payoutGet: ActionDefinition<Input> = {
  key: "payout-get",
  type: "read",
  resource: "payout",
  title: "Get Payout",
  description: "Fetch one payout with its fee breakdown and accounting sync status.",
  params: [
    { key: "id", label: "Payout ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Payout ID" },
    { key: "payoutNumber", type: "string", label: "Payout number" },
    { key: "depositDate", type: "string", label: "Deposit date" },
    { key: "amount", type: "string", label: "Amount" },
    { key: "status", type: "object", label: "Status" },
  ],

  execute(input, ctx) {
    return new AnchorClient(ctx).request("GET", `/payouts/${encodeId(input.id)}`);
  },
};

export default payoutGet;
