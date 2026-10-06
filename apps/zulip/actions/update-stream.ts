import type { ActionDefinition } from "@w6w/types";
import { payload, seg, ZulipClient } from "../lib/client.ts";

interface Input {
  stream_id: number;
  new_name?: string;
  description?: string;
  is_private?: boolean;
  is_web_public?: boolean;
  history_public_to_subscribers?: boolean;
  is_default_stream?: boolean;
}

const updateStream: ActionDefinition<Input> = {
  key: "update-stream",
  type: "perform",
  resource: "channel",
  title: "Update Channel",
  idempotent: true,
  description:
    "Rename a channel, change its description or privacy (PATCH /streams/{stream_id}). Needs channel-administration permission.",
  params: [
    {
      "key": "stream_id",
      "label": "Channel ID",
      "type": "number",
      "required": true,
      "hint": "Numeric channel ID. Find it with Get Channel ID or List Channels.",
    },
    {
      "key": "new_name",
      "label": "New name",
      "type": "string",
    },
    {
      "key": "description",
      "label": "Description",
      "type": "string",
    },
    {
      "key": "is_private",
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
      "key": "is_default_stream",
      "label": "Default channel for new users",
      "type": "boolean",
    },
  ],
  output: [],

  async execute(input, ctx) {
    const { stream_id: _id, ...form } = input;
    if (Object.values(form).every((v) => v === undefined || v === null)) {
      throw new Error("update-stream: set at least one field to change");
    }
    const res = await new ZulipClient(ctx).request("PATCH", `/streams/${seg(input.stream_id)}`, {
      form,
    });
    return payload(res);
  },
};

export default updateStream;
