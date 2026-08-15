import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam, folderIdParam, messageIdParam } from "../lib/params.ts";

interface MessageDeleteInput {
  accountId?: string;
  folderId: string;
  messageId: string;
  expunge?: boolean;
}

interface MessageDeleteOutput {
  cId: string;
}

/**
 * `DELETE /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}`
 * — "Delete an Email". `expunge` (default `false`, matching the vendor's own
 * default) chooses permanent deletion over moving to Trash — off by default
 * so the safe path is the one that needs no extra flag.
 */
const messageDelete: ActionDefinition<MessageDeleteInput, MessageDeleteOutput> = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Email",
  description: "Delete one email — moved to Trash unless Permanently delete is on.",
  idempotent: true,
  params: [
    accountIdParam,
    folderIdParam,
    messageIdParam,
    {
      key: "expunge",
      label: "Permanently delete",
      type: "boolean",
      hint: "Off (default) moves the email to Trash. On deletes it permanently, bypassing Trash.",
    },
  ],
  output: [{ key: "cId", type: "string", label: "Change id" }],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const result = await new ZohoMailClient(ctx).request<MessageDeleteOutput>(
      `/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(input.folderId)}` +
        `/messages/${encodeURIComponent(input.messageId)}`,
      { method: "DELETE", query: compact({ expunge: input.expunge }) },
    );
    return result ?? { cId: "" };
  },
};

export default messageDelete;
