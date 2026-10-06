import type { ActionDefinition } from "@w6w/types";
import { asItems, obj, SolapiClient } from "../lib/client.ts";

/**
 * List Sender Numbers — List every sender number registered to the account with its status (PENDING, ACTIVE, INACTIVE, BLOCKED, DUPLICATED, EXPIRED, OVERLIMIT) and the registration limit.
 *
 * Verified against the SOLAPI developer reference (solapi.com/developers/api, fetched 2026-10-06).
 */
type Input = Record<string, never>;

const listSenderNumbers: ActionDefinition<Input> = {
  key: "list-sender-numbers",
  type: "read",
  resource: "sender",
  title: "List Sender Numbers",
  description:
    "List every sender number registered to the account with its status (PENDING, ACTIVE, INACTIVE, BLOCKED, DUPLICATED, EXPIRED, OVERLIMIT) and the registration limit.",
  params: [],
  output: [
    {
      "key": "accountId",
      "type": "string",
      "label": "Account ID",
    },
    {
      "key": "limit",
      "type": "number",
      "label": "How many sender numbers the account may register",
    },
    {
      "key": "items",
      "type": "array",
      "label": "Sender numbers: handleKey, phoneNumber, status, method, expireAt",
    },
    {
      "key": "count",
      "type": "number",
      "label": "Sender numbers returned",
    },
  ],

  async execute(_input, ctx) {
    const b = obj(await new SolapiClient(ctx).json("/senderid/v1/numbers"));
    const items = asItems(b.senderIds);
    return { accountId: b.accountId ?? null, limit: b.limit ?? null, items, count: items.length };
  },
};

export default listSenderNumbers;
