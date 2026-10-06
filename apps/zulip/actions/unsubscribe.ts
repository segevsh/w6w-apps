import type { ActionDefinition } from "@w6w/types";
import { idOrEmailList, payload, strList, ZulipClient } from "../lib/client.ts";

interface Input {
  channels: unknown;
  principals?: unknown;
}

const unsubscribe: ActionDefinition<Input> = {
  key: "unsubscribe",
  type: "perform",
  resource: "subscription",
  title: "Unsubscribe from Channels",
  idempotent: true,
  description:
    "Unsubscribe the connected user (or others) from channels by name (DELETE /users/me/subscriptions).",
  params: [
    {
      "key": "channels",
      "label": "Channel names",
      "type": "string",
      "required": true,
      "hint": "Comma-separated names.",
    },
    {
      "key": "principals",
      "label": "Unsubscribe these users",
      "type": "string",
      "hint":
        "Comma-separated user IDs or emails; omit to unsubscribe yourself. Administrators only.",
    },
  ],
  output: [
    {
      "key": "removed",
      "type": "array",
      "label": "Channels unsubscribed from",
    },
    {
      "key": "not_removed",
      "type": "array",
      "label": "Channels the user was not subscribed to",
    },
  ],

  async execute(input, ctx) {
    const names = strList(input.channels);
    if (!names) throw new Error("unsubscribe: `channels` is required");
    const res = await new ZulipClient(ctx).request("DELETE", "/users/me/subscriptions", {
      form: { subscriptions: names, principals: idOrEmailList(input.principals) },
    });
    return payload(res);
  },
};

export default unsubscribe;
