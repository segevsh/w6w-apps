import type { ActionDefinition } from "@w6w/types";
import { GoogleChatClient, messageName } from "../lib/client.ts";

interface Input {
  space: string;
  message: string;
  force?: boolean;
}

/**
 * `spaces.messages.delete` — DELETE /v1/{name=spaces/*&#47;messages/*}
 * https://developers.google.com/workspace/chat/api/reference/rest/v1/spaces.messages/delete
 *
 * Google documents an `Empty` response body, so the client normalises it to
 * `undefined` and we return a `{ success: true }` sentinel instead.
 *
 * `force` is a user-auth-only flag: Google states it "only applies when
 * authenticating as a user" and has no effect for a Chat app. Exposing it is
 * therefore correct for this app and would be misleading in an app-auth one.
 */
const deleteMessage: ActionDefinition<Input, { success: true }> = {
  key: "delete-message",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description:
    "Delete a message. With a user connection the user can only delete their own messages, unless they manage the space.",
  // Deleting an already-deleted message is a 404, but the end state is the same.
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
        "The message id, a `client-` custom id, or the full resource name `spaces/{space}/messages/{message}`.",
      placeholder: "BBBBBBBBBBB.BBBBBBBBBBB",
    },
    {
      key: "force",
      label: "Delete threaded replies",
      type: "boolean",
      hint:
        "When false (Google's default) deleting a message that has replies fails. When true the replies go too.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const client = new GoogleChatClient(ctx);
    await client.request<void>(`/${messageName(input.space, input.message)}`, {
      method: "DELETE",
      query: { force: input.force },
    });
    return { success: true };
  },
};

export default deleteMessage;
