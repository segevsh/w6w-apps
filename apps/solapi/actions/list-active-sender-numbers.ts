import type { ActionDefinition } from "@w6w/types";
import { asItems, SolapiClient } from "../lib/client.ts";

/**
 * List Active Sender Numbers — List only the sender numbers that can send right now (status ACTIVE). Use it to pick a valid From for a send.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
type Input = Record<string, never>;

const listActiveSenderNumbers: ActionDefinition<Input> = {
  key: "list-active-sender-numbers",
  type: "read",
  resource: "sender",
  title: "List Active Sender Numbers",
  description:
    "List only the sender numbers that can send right now (status ACTIVE). Use it to pick a valid From for a send.",
  params: [],
  output: [
    {
      "key": "items",
      "type": "array",
      "label": "Active sender numbers: handleKey, phoneNumber, method, expireAt",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Sender numbers returned",
    },
  ],

  async execute(_input, ctx) {
    const items = asItems(await new SolapiClient(ctx).json("/senderid/v1/numbers/active"));
    return { items, count: items.length };
  },
};

export default listActiveSenderNumbers;
