import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  message_id: number;
  emoji_name?: string;
  emoji_code?: string;
  reaction_type?: "unicode_emoji" | "realm_emoji" | "zulip_extra_emoji";
}

const addReaction: ActionDefinition<Input> = {
  key: "add-reaction",
  type: "perform",
  resource: "reaction",
  title: "Add Reaction",
  idempotent: false,
  description:
    "Add an emoji reaction as the connected user (POST /messages/{message_id}/reactions).",
  params: [
    {
      "key": "message_id",
      "label": "Message ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "emoji_name",
      "label": "Emoji name",
      "type": "string",
      "required": true,
      "hint": "e.g. `thumbs_up`, `octopus`.",
    },
    {
      "key": "emoji_code",
      "label": "Emoji code",
      "type": "string",
      "hint": "Optional; the server derives it from the name when omitted.",
    },
    {
      "key": "reaction_type",
      "label": "Reaction type",
      "type": "select",
      "options": [
        {
          "value": "unicode_emoji",
          "label": "unicode_emoji",
        },
        {
          "value": "realm_emoji",
          "label": "realm_emoji",
        },
        {
          "value": "zulip_extra_emoji",
          "label": "zulip_extra_emoji",
        },
      ],
    },
  ],
  output: [],

  async execute(input, ctx) {
    const { message_id: _id, ...form } = input;
    if (!form.emoji_name) throw new Error("add-reaction: `emoji_name` is required");
    const res = await new ZulipClient(ctx).request(
      "POST",
      `/messages/${seg(input.message_id)}/reactions`,
      { form },
    );
    return payload(res);
  },
};

export default addReaction;
