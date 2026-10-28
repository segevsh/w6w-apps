import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * `DELETE /me/messages/{id}` — move a message to Deleted Items.
 *
 * https://learn.microsoft.com/en-us/graph/api/message-delete
 *
 * This is Outlook's ordinary delete, so the message lands in Deleted Items and
 * stays recoverable; it is not a purge. Graph notes that items already inside
 * `recoverableitemsdeletions` may not be deletable at all.
 *
 * Requires the `Mail.ReadWrite` scope. Answers `204 No Content`.
 */
const deleteMessage: ActionDefinition<Input> = {
  key: "delete-message",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Delete a message, moving it to Deleted Items.",
  // Deleting an already-deleted id is a no-op from the caller's point of view;
  // the desired end state is reached either way.
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.status(`/me/messages/${encodeURIComponent(input.messageId)}`, {
      method: "DELETE",
    });
  },
};

export default deleteMessage;
