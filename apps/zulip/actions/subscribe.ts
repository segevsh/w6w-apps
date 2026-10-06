import type { ActionDefinition } from "@w6w/types";
import { idOrEmailList, payload, strList, ZulipClient } from "../lib/client.ts";

interface Input {
  channels: unknown;
  description?: string;
  principals?: unknown;
  invite_only?: boolean;
  is_web_public?: boolean;
  announce?: boolean;
  authorization_errors_fatal?: boolean;
}

const subscribe: ActionDefinition<Input> = {
  key: "subscribe",
  type: "perform",
  resource: "subscription",
  title: "Subscribe to Channels",
  idempotent: true,
  description:
    "Subscribe the connected user (or others) to channels, creating any that do not exist (POST /users/me/subscriptions).",
  params: [
    {
      "key": "channels",
      "label": "Channel names",
      "type": "string",
      "required": true,
      "hint": "Comma-separated names. A name that does not exist is created.",
    },
    {
      "key": "description",
      "label": "Description for new channels",
      "type": "string",
    },
    {
      "key": "principals",
      "label": "Subscribe these users",
      "type": "string",
      "hint":
        "Comma-separated user IDs or emails; omit to subscribe yourself. Needs permission to add others.",
    },
    {
      "key": "invite_only",
      "label": "Private (new channels)",
      "type": "boolean",
    },
    {
      "key": "is_web_public",
      "label": "Web-public (new channels)",
      "type": "boolean",
    },
    {
      "key": "announce",
      "label": "Announce new channels",
      "type": "boolean",
    },
    {
      "key": "authorization_errors_fatal",
      "label": "Fail on any authorization error",
      "type": "boolean",
    },
  ],
  output: [
    {
      "key": "subscribed",
      "type": "object",
      "label": "Newly subscribed channels by user",
    },
    {
      "key": "already_subscribed",
      "type": "object",
      "label": "Already-subscribed channels by user",
    },
    {
      "key": "unauthorized",
      "type": "array",
      "label": "Channels the user may not subscribe to",
    },
  ],

  async execute(input, ctx) {
    const names = strList(input.channels);
    if (!names) throw new Error("subscribe: `channels` is required");
    const res = await new ZulipClient(ctx).request("POST", "/users/me/subscriptions", {
      form: {
        subscriptions: names.map((name) =>
          input.description ? { name, description: input.description } : { name }
        ),
        principals: idOrEmailList(input.principals),
        invite_only: input.invite_only,
        is_web_public: input.is_web_public,
        announce: input.announce,
        authorization_errors_fatal: input.authorization_errors_fatal,
      },
    });
    return payload(res);
  },
};

export default subscribe;
