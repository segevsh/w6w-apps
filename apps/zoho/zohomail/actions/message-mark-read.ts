import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, toIdArray, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface MessageMarkReadInput {
  accountId?: string;
  messageId: string | string[];
  read?: boolean;
}

/**
 * `PUT /api/accounts/{accountId}/updatemessage` with `mode: "markAsRead"` /
 * `"markAsUnread"` — "Mark Emails as Read" / "Mark Emails as Unread". Same
 * endpoint, same body shape, the vendor only varies `mode` — modelled here as
 * one action with a `read` toggle rather than two near-identical ones.
 */
const messageMarkRead: ActionDefinition<MessageMarkReadInput, { ok: boolean }> = {
  key: "message-mark-read",
  type: "perform",
  resource: "message",
  title: "Mark Email Read/Unread",
  description: "Mark one or more emails as read or unread.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "messageId",
      label: "Message ID(s)",
      type: "string",
      required: true,
      hint: "One id, or a comma-separated list. Take them from a List/Search Emails result.",
    },
    {
      key: "read",
      label: "Mark as read",
      type: "boolean",
      default: true,
      hint: "On marks read (default). Off marks unread.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const messageId = toIdArray(input.messageId);
    if (!messageId) throw new Error("`messageId` is required");
    await new ZohoMailClient(ctx).request(
      `/accounts/${encodeURIComponent(accountId)}/updatemessage`,
      {
        method: "PUT",
        body: { mode: input.read === false ? "markAsUnread" : "markAsRead", messageId },
      },
    );
    return { ok: true };
  },
};

export default messageMarkRead;
