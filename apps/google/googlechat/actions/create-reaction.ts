import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, messageName } from "../lib/client.ts";

interface Input {
  space: string;
  message: string;
  emoji?: string;
  customEmoji?: string;
}

interface ReactionPayload {
  emoji: { unicode?: string; customEmoji?: { uid: string } };
}

/**
 * `spaces.messages.reactions.create` — POST /v1/{parent=spaces/*&#47;messages/*}/reactions
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages.reactions/create
 *
 * Reactions are **user authentication only** — Google's auth guide lists
 * "manage reactions" under user auth, and the discovery document offers no
 * `chat.bot` or `chat.app.*` scope on this method.
 *
 * An `Emoji` carries exactly one of `unicode` or `customEmoji`, which is why the
 * two inputs are mutually exclusive rather than merged.
 */
const createReaction: ActionDefinition<Input> = {
  key: "create-reaction",
  type: "perform",
  resource: "reaction",
  title: "Add Reaction",
  description:
    "React to a message with a standard or custom emoji. Requires a user connection — Chat apps cannot manage reactions.",
  // Reacting twice with the same emoji returns ALREADY_EXISTS rather than
  // stacking a second reaction, so a retry converges on the same state.
  idempotent: true,
  params: [
    {
      key: "space",
      label: "Space",
      type: "string",
      required: true,
      hint: "The space id, or the full resource name `spaces/{space}`.",
      placeholder: "spaces/AAAAAAAAAAA",
    },
    {
      key: "message",
      label: "Message",
      type: "string",
      required: true,
      hint:
        "The message id, or the full resource name `spaces/{space}/messages/{message}` — a full name here overrides Space.",
      placeholder: "BBBBBBBBBBB.BBBBBBBBBBB",
    },
    {
      key: "emoji",
      label: "Emoji",
      type: "string",
      hint: "A single standard Unicode emoji. Mutually exclusive with Custom emoji.",
      placeholder: "👍",
    },
    {
      key: "customEmoji",
      label: "Custom emoji",
      type: "string",
      hint:
        "The `uid` of a custom emoji in the Workspace organisation. Mutually exclusive with Emoji.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Reaction resource name" },
    { key: "emoji", type: "object", label: "Emoji" },
    { key: "user", type: "object", label: "Reacting user" },
  ],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    if (!input.emoji && !input.customEmoji) {
      throw new Error("Google Chat: supply either a Unicode emoji or a custom emoji uid");
    }
    if (input.emoji && input.customEmoji) {
      throw new Error("Google Chat: a reaction carries either a Unicode emoji or a custom one");
    }

    const body: ReactionPayload = input.emoji
      ? { emoji: { unicode: input.emoji } }
      : { emoji: { customEmoji: { uid: input.customEmoji!.trim() } } };

    return await client.request(`/${messageName(input.space, input.message)}/reactions`, {
      method: "POST",
      body,
    });
  },
};

export default createReaction;
