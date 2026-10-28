import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, toIdArray, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface MessageMoveInput {
  accountId?: string;
  messageId: string;
  destfolderId: string;
  isArchive?: boolean;
}

/** `PUT /api/accounts/{accountId}/updatemessage` with `mode: "moveMessage"` — "Move Emails". */
const messageMove: ActionDefinition<MessageMoveInput, { ok: boolean }> = {
  key: "message-move",
  type: "perform",
  resource: "message",
  title: "Move Email",
  description: "Move one or more emails to a different folder.",
  idempotent: true,
  params: [
    accountIdParam,
    {
      key: "messageId",
      label: "Message ID(s)",
      type: "string",
      required: true,
      hint: "One id, or a comma-separated list.",
    },
    {
      key: "destfolderId",
      label: "Destination folder ID",
      type: "string",
      required: true,
      hint: "Use Get Folders to find a folder's id.",
    },
    {
      key: "isArchive",
      label: "Include archived emails",
      type: "boolean",
      advanced: true,
      hint: "Off (default) excludes archived emails from the move.",
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
        body: compact({
          mode: "moveMessage",
          messageId,
          destfolderId: input.destfolderId,
          isArchive: input.isArchive,
        }),
      },
    );
    return { ok: true };
  },
};

export default messageMove;
