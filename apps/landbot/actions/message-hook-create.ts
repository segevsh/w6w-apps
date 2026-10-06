import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, LandbotClient, redactToken } from "../lib/client.ts";

/**
 * Create Message Hook — Register a URL Landbot calls for every message on a channel. The optional token is sent back to your URL by Landbot; it is not returned by this action.
 *
 * Verified against Landbot's OpenAPI document (fetched 2026-10-06).
 */
interface Input {
  channelId: number;
  url: string;
  token?: string;
  name?: string;
}

const messageHookCreate: ActionDefinition<Input> = {
  key: "message-hook-create",
  type: "perform",
  resource: "message-hook",
  title: "Create Message Hook",
  description:
    "Register a URL Landbot calls for every message on a channel. The optional token is sent back to your URL by Landbot; it is not returned by this action.",
  idempotent: false,
  params: [
    {
      "key": "channelId",
      "label": "Channel ID",
      "type": "number",
      "required": true,
      "hint": "Numeric channel id (from List Channels).",
    },
    {
      "key": "url",
      "label": "URL",
      "type": "string",
      "required": true,
      "hint": "HTTPS endpoint Landbot will call.",
    },
    {
      "key": "token",
      "label": "Token",
      "type": "secret",
      "hint": "Secret for your endpoint to check.",
    },
    {
      "key": "name",
      "label": "Name",
      "type": "string",
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
        `/channels/${encodeId(input.channelId)}/message_hooks/`,
        "hook",
        {
          method: "POST",
          body: compact({ url: input.url, token: input.token, name: input.name }),
        },
      ),
    );
  },
};

export default messageHookCreate;
