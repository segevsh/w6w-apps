import type { ActionDefinition } from "@w6w/types";
import { intList, payload, ZulipClient } from "../lib/client.ts";

interface Input {
  messages: unknown;
  op: "add" | "remove";
  flag: string;
}

const updateMessageFlags: ActionDefinition<Input> = {
  key: "update-message-flags",
  type: "perform",
  resource: "message",
  title: "Update Message Flags",
  idempotent: true,
  description:
    "Add or remove a personal flag (read, starred, collapsed, hide_link_previews) on a list of messages (POST /messages/flags).",
  params: [
    {
      "key": "messages",
      "label": "Message IDs",
      "type": "string",
      "required": true,
      "hint": "Comma-separated message IDs.",
    },
    {
      "key": "op",
      "label": "Operation",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "add",
          "label": "add",
        },
        {
          "value": "remove",
          "label": "remove",
        },
      ],
    },
    {
      "key": "flag",
      "label": "Flag",
      "type": "select",
      "required": true,
      "options": [
        {
          "value": "read",
          "label": "read",
        },
        {
          "value": "starred",
          "label": "starred",
        },
        {
          "value": "collapsed",
          "label": "collapsed",
        },
        {
          "value": "hide_link_previews",
          "label": "hide_link_previews",
        },
      ],
    },
  ],
  output: [
    {
      "key": "messages",
      "type": "array",
      "label": "IDs of the messages updated",
    },
  ],

  async execute(input, ctx) {
    const ids = intList(input.messages, "messages");
    if (!ids) throw new Error("update-message-flags: `messages` is required");
    const res = await new ZulipClient(ctx).request("POST", "/messages/flags", {
      form: { messages: ids, op: input.op, flag: input.flag },
    });
    return payload(res);
  },
};

export default updateMessageFlags;
