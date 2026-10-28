import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, reactionName } from "../lib/client.ts";

interface Input {
  space: string;
  message: string;
  reaction: string;
}

/**
 * `spaces.messages.reactions.delete` — DELETE
 * /v1/{name=spaces/*&#47;messages/*&#47;reactions/*}
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages.reactions/delete
 *
 * Google documents an `Empty` response body, so the client normalises it to
 * `undefined` and we return a `{ success: true }` sentinel instead.
 *
 * The reaction id is not guessable from the emoji — it comes from a reaction's
 * `name` (List Reactions, or the Add Reaction response), which is the deepest
 * of the four resource names this app builds.
 */
const deleteReaction: ActionDefinition<Input, { success: true }> = {
  key: "delete-reaction",
  type: "perform",
  resource: "reaction",
  title: "Remove Reaction",
  description:
    "Remove one of the authenticated user's own reactions from a message. Requires a user connection — Chat apps cannot manage reactions.",
  // Removing an already-removed reaction is a 404, but the end state is the same.
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
      hint: "The message id, or the full resource name `spaces/{space}/messages/{message}`.",
      placeholder: "BBBBBBBBBBB.BBBBBBBBBBB",
    },
    {
      key: "reaction",
      label: "Reaction",
      type: "string",
      required: true,
      hint:
        "The reaction id from List Reactions, or the full resource name `spaces/{space}/messages/{message}/reactions/{reaction}` — a full name here overrides the other two fields.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Removed" }],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    await client.request<void>(
      `/${reactionName(input.space, input.message, input.reaction)}`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default deleteReaction;
