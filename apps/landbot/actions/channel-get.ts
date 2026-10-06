import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient, redactToken } from "../lib/client.ts";

/**
 * Get Channel — Fetch one channel by id. The channel token is redacted.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  channelId: number;
}

const channelGet: ActionDefinition<Input> = {
  key: "channel-get",
  type: "read",
  resource: "channel",
  title: "Get Channel",
  description: "Fetch one channel by id. The channel token is redacted.",
  params: [
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "number",
      "required": true,
      "hint": "Numeric channel id (from List Channels).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Channel type" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "created_at", type: "number", label: "Created (Unix time)" },
    { key: "token", type: "string", label: "Channel token (always redacted)" },
    { key: "image", type: "string", label: "Image URL" },
  ],

  async execute(input, ctx) {
    return redactToken(
      await new LandbotClient(ctx).get(`/channels/${encodeId(input.channelId)}/`, "channel"),
    );
  },
};

export default channelGet;
