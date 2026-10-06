import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient, redactToken } from "../lib/client.ts";

/**
 * Get Message Hook — Fetch one message hook. The hook secret is redacted.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  channelId: number;
  hookId: number;
}

const messageHookGet: ActionDefinition<Input> = {
  key: "message-hook-get",
  type: "read",
  resource: "message-hook",
  title: "Get Message Hook",
  description: "Fetch one message hook. The hook secret is redacted.",
  params: [
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "number",
      "required": true,
      "hint": "Numeric channel id (from List Channels).",
    },
    {
      "key": "hookId",
      "label": "Hook ID",
      "type": "number",
      "required": true,
      "hint": "Numeric message hook id (from List Message Hooks).",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Hook ID" },
    { key: "url", type: "string", label: "Callback URL" },
    { key: "token", type: "string", label: "Hook secret (always redacted)" },
    { key: "name", type: "string", label: "Name" },
    { key: "channel_id", type: "number", label: "Channel ID" },
    { key: "created_at", type: "number", label: "Created" },
    { key: "updated_at", type: "number", label: "Updated" },
  ],

  async execute(input, ctx) {
    return redactToken(
      await new LandbotClient(ctx).get(
        `/channels/${encodeId(input.channelId)}/message_hooks/${encodeId(input.hookId)}/`,
        "hook",
      ),
    );
  },
};

export default messageHookGet;
