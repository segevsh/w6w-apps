import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, toIdArray, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam } from "../lib/params.ts";

interface MessageLabelApplyInput {
  accountId?: string;
  messageId: string;
  labelId: string;
  isArchive?: boolean;
}

/**
 * `PUT /api/accounts/{accountId}/updatemessage` with `mode: "applyLabel"` —
 * "Apply Labels to Emails". Removing a label uses the same endpoint with
 * `mode: "removeLabel"`, and Zoho's own set of `updatemessage` modes covers
 * several more operations beyond apply/remove (archive, spam, flag) — this
 * app implements the read/move/label-apply cases that came up first; the
 * rest are additive if a workflow needs them.
 */
const messageLabelApply: ActionDefinition<MessageLabelApplyInput, { ok: boolean }> = {
  key: "message-label-apply",
  type: "perform",
  resource: "message",
  title: "Apply Label to Email",
  description: "Apply one or more labels to one or more emails.",
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
      key: "labelId",
      label: "Label ID(s)",
      type: "string",
      required: true,
      hint: "One id, or a comma-separated list. Use Get Labels to find an id.",
    },
    {
      key: "isArchive",
      label: "Include archived emails",
      type: "boolean",
      advanced: true,
      hint: "Off (default) excludes archived emails.",
    },
  ],
  output: [{ key: "ok", type: "boolean", label: "Success" }],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const messageId = toIdArray(input.messageId);
    const labelId = toIdArray(input.labelId);
    if (!messageId) throw new Error("`messageId` is required");
    if (!labelId) throw new Error("`labelId` is required");
    await new ZohoMailClient(ctx).request(
      `/accounts/${encodeURIComponent(accountId)}/updatemessage`,
      {
        method: "PUT",
        body: compact({ mode: "applyLabel", messageId, labelId, isArchive: input.isArchive }),
      },
    );
    return { ok: true };
  },
};

export default messageLabelApply;
