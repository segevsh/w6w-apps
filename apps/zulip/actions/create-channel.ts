import type { ActionDefinition } from "@w6w/types";
import { intList, payload, ZulipClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  subscribers?: unknown;
  invite_only?: boolean;
  is_web_public?: boolean;
  history_public_to_subscribers?: boolean;
  announce?: boolean;
}

const createChannel: ActionDefinition<Input> = {
  key: "create-channel",
  type: "perform",
  resource: "channel",
  title: "Create Channel",
  idempotent: false,
  description:
    "Create a channel and optionally subscribe users (POST /channels/create, Zulip 11.0+; Zulip Cloud runs it). Needs permission to create channels.",
  params: [
    {
      "key": "name",
      "label": "Name",
      "type": "string",
      "required": true,
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "subscribers",
      "label": "Subscribers",
      "type": "string",
      "hint":
        "Comma-separated user IDs to subscribe. The API requires the list; empty is sent when blank. The creator is not added unless listed.",
    },
    {
      "key": "invite_only",
      "label": "Private",
      "type": "boolean",
    },
    {
      "key": "is_web_public",
      "label": "Web-public",
      "type": "boolean",
    },
    {
      "key": "history_public_to_subscribers",
      "label": "History visible to new subscribers",
      "type": "boolean",
    },
    {
      "key": "announce",
      "label": "Announce in #announce",
      "type": "boolean",
    },
  ],
  output: [
    {
      "key": "id",
      "type": "number",
      "label": "ID of the new channel",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("POST", "/channels/create", {
      form: {
        name: input.name,
        description: input.description,
        subscribers: intList(input.subscribers, "subscribers") ?? [],
        invite_only: input.invite_only,
        is_web_public: input.is_web_public,
        history_public_to_subscribers: input.history_public_to_subscribers,
        announce: input.announce,
      },
    });
    return payload(res);
  },
};

export default createChannel;
