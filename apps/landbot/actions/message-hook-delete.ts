import type { ActionDefinition } from "@w6w/types";
import { encodeId, LandbotClient } from "../lib/client.ts";

/**
 * Delete Message Hook — Remove a message hook.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  channelId: number;
  hookId: number;
}

const messageHookDelete: ActionDefinition<Input> = {
  key: "message-hook-delete",
  type: "perform",
  resource: "message-hook",
  title: "Delete Message Hook",
  description: "Remove a message hook.",
  idempotent: true,
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
    { key: "ok", type: "boolean", label: "True when Landbot accepted the request" },
  ],

  execute(input, ctx) {
    return new LandbotClient(ctx).done(
      `/channels/${encodeId(input.channelId)}/message_hooks/${encodeId(input.hookId)}/`,
      { method: "DELETE" },
    );
  },
};

export default messageHookDelete;
