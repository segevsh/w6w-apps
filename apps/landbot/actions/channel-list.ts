import type { ActionDefinition } from "@w6w/types";
import { LandbotClient, redactToken } from "../lib/client.ts";

/**
 * List Channels — List the channels (web, WhatsApp, Messenger, APIchat) in the workspace. Channel tokens are redacted.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  type?: string;
  active?: boolean;
  offset?: number;
  limit?: number;
}

const channelList: ActionDefinition<Input> = {
  key: "channel-list",
  type: "search",
  resource: "channel",
  title: "List Channels",
  description:
    "List the channels (web, WhatsApp, Messenger, APIchat) in the workspace. Channel tokens are redacted.",
  params: [
    {
      "key": "type",
      "label": "Type",
      "type": "select",
      "options": [
        {
          "value": "facebook",
          "label": "facebook",
        },
        {
          "value": "apichat",
          "label": "apichat",
        },
        {
          "value": "landbot",
          "label": "landbot",
        },
        {
          "value": "whatsapi",
          "label": "whatsapi",
        },
      ],
    },
    {
      "key": "active",
      "label": "Active only",
      "type": "boolean",
    },
    {
      "key": "offset",
      "label": "Offset",
      "type": "number",
      "hint": "Number of records to skip. Use nextOffset from the previous page.",
      "validation": {
        "min": 0,
        "integer": true,
      },
    },
    {
      "key": "limit",
      "label": "Limit",
      "type": "number",
      "hint": "Page size, 0-100 (default 20).",
      "validation": {
        "min": 0,
        "max": 100,
        "integer": true,
      },
    },
  ],
  output: [
    { key: "channels", type: "array", label: "Channels" },
    { key: "count", type: "number", label: "Items on this page" },
    { key: "total", type: "number", label: "Total matching records" },
    { key: "nextOffset", type: "number", label: "Offset of the next page, null on the last" },
  ],

  async execute(input, ctx) {
    const r = await new LandbotClient(ctx).list("/channels/", "channels", {
      query: { type: input.type, active: input.active, offset: input.offset, limit: input.limit },
    });
    return { ...r, channels: (r.channels as unknown[]).map(redactToken) };
  },
};

export default channelList;
