import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam, folderIdParam, messageIdParam } from "../lib/params.ts";

interface MessageGetInput {
  accountId?: string;
  folderId: string;
  messageId: string;
}

interface MessageGetOutput {
  messageId: string;
  subject: string;
  fromAddress: string;
  toAddress: string;
  ccAddress: string;
  sender: string;
  summary: string;
  status: string;
  sentDateInGMT: string;
  receivedTime: string;
  folderId: string;
  size: string;
  hasAttachment: string;
  priority: string;
}

/**
 * `GET /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/details`
 * — "Get Meta Data of an Email". The message's own metadata (subject,
 * addresses, timestamps, size) without fetching the body — cheaper than
 * `message-content-get` when only the header-level facts matter.
 */
const messageGet: ActionDefinition<MessageGetInput, MessageGetOutput> = {
  key: "message-get",
  type: "read",
  resource: "message",
  title: "Get Email Metadata",
  description: "Fetch one email's metadata (subject, addresses, size, status) without its body.",
  params: [accountIdParam, folderIdParam, messageIdParam],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "fromAddress", type: "string", label: "From address" },
    { key: "toAddress", type: "string", label: "To address" },
    { key: "ccAddress", type: "string", label: "Cc address" },
    { key: "sender", type: "string", label: "Sender display name" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "status", type: "string", label: "Read status" },
    { key: "sentDateInGMT", type: "string", label: "Sent date (GMT, epoch ms)" },
    { key: "receivedTime", type: "string", label: "Received time (epoch ms)" },
    { key: "folderId", type: "string", label: "Folder ID" },
    { key: "size", type: "string", label: "Size (bytes)" },
    { key: "hasAttachment", type: "string", label: "Has attachment" },
    { key: "priority", type: "string", label: "Priority" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const details = await new ZohoMailClient(ctx).request<MessageGetOutput>(
      `/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(input.folderId)}` +
        `/messages/${encodeURIComponent(input.messageId)}/details`,
    );
    if (!details) throw new Error(`Zoho Mail returned no metadata for message ${input.messageId}`);
    return details;
  },
};

export default messageGet;
