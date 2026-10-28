import type { ActionDefinition } from "@w6w/types";
import { GraphClient } from "../lib/client.ts";
import { buildMessage, type MessageInput } from "../lib/message.ts";
import { messageBodyParams } from "../lib/params.ts";

interface Input extends MessageInput {
  folderId?: string;
}

/**
 * `POST /me/messages` — save a draft without sending it.
 *
 * https://learn.microsoft.com/en-us/graph/api/user-post-messages
 *
 * Lands in Drafts by default; pass a folder to place it elsewhere. Pair with
 * Send Draft to review-then-send, which is the reason this exists separately
 * from Send Message.
 *
 * Requires the `Mail.ReadWrite` scope. Answers `201 Created` with the message.
 */
const createDraft: ActionDefinition<Input> = {
  key: "create-draft",
  type: "perform",
  resource: "message",
  title: "Create Draft",
  description: "Create a draft message without sending it.",
  // No idempotency key on the endpoint — a retry creates a second draft.
  idempotent: false,
  params: [
    // `to` is required for sending, but a draft is legitimately incomplete.
    ...messageBodyParams().map((p) => p.key === "to" ? { ...p, required: false } : p),
    {
      key: "folderId",
      label: "Mail folder",
      type: "string",
      advanced: true,
      hint: "Folder id or well-known name. Defaults to `drafts`.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "isDraft", type: "boolean", label: "Is draft" },
    { key: "parentFolderId", type: "string", label: "Parent folder ID" },
    { key: "webLink", type: "string", label: "Web link" },
  ],

  execute(input, ctx) {
    const client = new GraphClient(ctx);
    const path = input.folderId
      ? `/me/mailFolders/${encodeURIComponent(input.folderId)}/messages`
      : "/me/messages";
    return client.request(path, { method: "POST", body: buildMessage(input) });
  },
};

export default createDraft;
