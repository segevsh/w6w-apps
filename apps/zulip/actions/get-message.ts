import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  message_id: number;
  apply_markdown?: boolean;
}

const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description:
    "Fetch one message, with its raw Markdown source in `raw_content` (GET /messages/{message_id}).",
  params: [
    {
      "key": "message_id",
      "label": "Message ID",
      "type": "number",
      "required": true,
    },
    {
      "key": "apply_markdown",
      "label": "Render Markdown as HTML",
      "type": "boolean",
      "hint": "Default false here (Zulip itself defaults to true).",
    },
  ],
  output: [
    {
      "key": "message",
      "type": "object",
      "label": "The message",
    },
    {
      "key": "raw_content",
      "type": "string",
      "label": "Markdown source of the message",
    },
  ],

  async execute(input, ctx) {
    const res = await new ZulipClient(ctx).request("GET", `/messages/${seg(input.message_id)}`, {
      query: { apply_markdown: input.apply_markdown ?? false },
    });
    return payload(res);
  },
};

export default getMessage;
