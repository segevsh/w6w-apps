import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient, redactToken } from "../lib/client.ts";

/**
 * List Message Hooks — List the URLs Landbot calls for every message on a channel. Hook secrets are redacted.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  channelId: number;
}

const messageHookList: ActionDefinition<Input> = {
  key: "message-hook-list",
  type: "search",
  resource: "message-hook",
  title: "List Message Hooks",
  description:
    "List the URLs Landbot calls for every message on a channel. Hook secrets are redacted.",
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
    { key: "hooks", type: "array", label: "Hooks" },
    { key: "count", type: "number", label: "Hooks returned" },
  ],

  async execute(input, ctx) {
    const r = await new LandbotClient(ctx).list(
      `/channels/${encodeId(input.channelId)}/message_hooks/`,
      "hooks",
    );
    return { hooks: (r.hooks as unknown[]).map(redactToken), count: r.count };
  },
};

export default messageHookList;
