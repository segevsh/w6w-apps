import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";

interface Input {
  messageId: string;
  destinationId: string;
}

/**
 * `POST /me/messages/{id}/move` — move a message to another mail folder.
 *
 * https://learn.microsoft.com/en-us/graph/api/message-move
 *
 * The one surprise worth knowing: Graph answers `201 Created` with a *new*
 * message resource carrying a **different `id`**, because a move is modelled as
 * a create-and-delete. Any downstream step must use the returned id, not the
 * one it passed in — which is also why this is not marked idempotent.
 *
 * Requires the `Mail.ReadWrite` scope.
 */
const moveMessage: ActionDefinition<Input> = {
  key: "move-message",
  type: "perform",
  resource: "message",
  title: "Move Message",
  description: "Move a message to another mail folder. Returns the message under its new id.",
  // Replaying the call fails: the original id no longer resolves after a
  // successful move.
  idempotent: false,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
    {
      key: "destinationId",
      label: "Destination folder",
      type: "string",
      required: true,
      hint:
        "Folder id, or a well-known name such as `archive`, `deleteditems`, `junkemail`, `inbox`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New message ID" },
    { key: "parentFolderId", type: "string", label: "New parent folder ID" },
    { key: "subject", type: "string", label: "Subject" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    return client.request(`/me/messages/${encodeURIComponent(input.messageId)}/move`, {
      method: "POST",
      body: { destinationId: input.destinationId },
    });
  },
};

export default moveMessage;
