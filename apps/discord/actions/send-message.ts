import type { ActionDefinition } from "@w6w/types";
import { DiscordClient } from "../lib/client.ts";

interface Input {
  channelId: string;
  content?: string;
  tts?: boolean;
  /** Reply to a message in the same channel. */
  replyToMessageId?: string;
  /** Free-form `embeds` array — Discord accepts up to 10, per the docs. */
  embeds?: Array<Record<string, unknown>>;
  /** Message flags (see Discord docs) — e.g. 4096 = SUPPRESS_NOTIFICATIONS, 4 = SUPPRESS_EMBEDS. */
  flags?: number;
  /** Which mentions in `content` are allowed to actually ping. */
  allowedMentions?: unknown;
  suppressAllMentions?: boolean;
  /** Interactive components — action rows of buttons / select menus. */
  components?: unknown;
  stickerIds?: string[];
}

/**
 * Send a message to a channel, thread, or DM channel.
 *
 * The n8n node exposes a rich "sendTo" selector (channel/user/thread) with
 * name-search and DM-channel bootstrapping. Here we accept a resolved
 * `channelId` — callers are expected to do the resolution (or use OAuth
 * `users.getOrCreateDMChannel` from a separate action if we add one later).
 *
 * https://discord.com/developers/docs/resources/channel#create-message
 */
const sendMessage: ActionDefinition<Input> = {
  key: "send-message",
  type: "perform",
  resource: "message",
  title: "Send Message",
  description: "Send a message to a channel.",
  params: [
    { key: "channelId", label: "Channel ID", type: "string", required: true },
    { key: "content", label: "Content", type: "text" },
    { key: "tts", label: "Text-to-Speech (TTS)", type: "boolean" },
    { key: "replyToMessageId", label: "Reply to Message ID", type: "string" },
    { key: "embeds", label: "Embeds", type: "json", hint: "Array of embed objects (up to 10)." },
    {
      key: "messageOptions",
      label: "Additional options",
      type: "section",
      section: "collapsible",
      title: "Additional options",
      subtitle: "Mention control, components, stickers, flags",
      collapsed: true,
      children: [
        {
          // Discord's default is that EVERY mention in the text pings, including
          // @everyone and @here. A workflow that posts text it did not author —
          // a form submission, a ticket body, an LLM reply — can mass-notify a
          // server, and there was no way to stop it from here. This is the
          // control, and the checkbox below is the safe one-click version.
          key: "suppressAllMentions",
          label: "Suppress all mentions",
          type: "boolean",
          default: false,
          hint:
            "Render @mentions as plain text without notifying anyone. The safe default for posting content the workflow did not author.",
        },
        {
          key: "allowedMentions",
          label: "Allowed mentions",
          type: "json",
          showIf: { field: "suppressAllMentions", truthy: false },
          hint:
            'Finer control, e.g. { "parse": ["users"] } to let user pings through but never @everyone, or { "users": ["123"] } to allow one. Omitted entirely, Discord pings everything the text mentions.',
        },
        {
          key: "components",
          label: "Components",
          type: "json",
          hint:
            "Array of action rows — buttons and select menus. Only an application (bot) token may send these.",
        },
        {
          key: "stickerIds",
          label: "Sticker IDs",
          type: "array",
          item: { type: "string" },
          hint: "Up to 3 sticker ids to send with the message.",
        },
        { key: "flags", label: "Flags", type: "number" },
      ],
    },
  ],

  execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.content !== undefined) body.content = input.content;
    if (input.tts !== undefined) body.tts = input.tts;
    if (input.embeds !== undefined) body.embeds = input.embeds;
    if (input.flags !== undefined) body.flags = input.flags;
    if (input.replyToMessageId) {
      body.message_reference = { message_id: input.replyToMessageId };
    }
    if (input.components !== undefined) body.components = input.components;
    const stickers = (input.stickerIds ?? []).map((id) => String(id).trim()).filter(Boolean);
    if (stickers.length) body.sticker_ids = stickers;
    // An empty `parse` array is Discord's documented way to say "resolve no
    // mentions at all"; it wins over any hand-written value, since the checkbox
    // is the explicit instruction.
    if (input.suppressAllMentions) {
      body.allowed_mentions = { parse: [] };
    } else if (input.allowedMentions !== undefined) {
      body.allowed_mentions = input.allowedMentions;
    }
    const client = new DiscordClient(ctx);
    return client.request(`/channels/${input.channelId}/messages`, {
      method: "POST",
      body,
    });
  },
};

export default sendMessage;
