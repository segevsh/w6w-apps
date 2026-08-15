import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam, includeToParam, pageParams } from "../lib/params.ts";

interface MessageSearchInput {
  accountId?: string;
  searchKey: string;
  receivedTime?: number;
  start?: number;
  limit?: number;
  includeto?: boolean;
}

interface MessageSearchOutputItem {
  messageId: number;
  folderId: number;
  subject: string;
  sender: string;
  fromAddress: string;
  summary: string;
  status: string;
  receivedtime: number;
  size: number;
  hasAttachment: number;
  threadId: number;
}

/**
 * `GET /api/accounts/{accountId}/messages/search` — "List Emails based on
 * Search Parameters". `searchKey` follows Zoho's own search grammar
 * (`https://www.zoho.com/mail/help/search-syntax.html`) — `parameter:value`
 * terms such as `sender:paula@zylker.com`, `subject:invoice` or
 * `fileName:report.pdf`, combinable with spaces, plus the built-in shorthand
 * `newMails`.
 */
const messageSearch: ActionDefinition<MessageSearchInput, MessageSearchOutputItem[]> = {
  key: "message-search",
  type: "search",
  resource: "message",
  title: "Search Emails",
  description: "Search emails using Zoho Mail's search syntax.",
  params: [
    accountIdParam,
    {
      key: "searchKey",
      label: "Search key",
      type: "string",
      required: true,
      placeholder: "sender:paula@zylker.com subject:invoice",
      hint: "Zoho Mail search syntax — parameter:value terms (entire, content, sender, to, cc, " +
        "subject, fileName, fileContent), or the shorthand newMails. See " +
        "https://www.zoho.com/mail/help/search-syntax.html.",
    },
    {
      key: "receivedTime",
      label: "Received before (epoch ms)",
      type: "number",
      advanced: true,
      hint: "Only emails received before this Unix timestamp (ms). Defaults to 2 minutes ago.",
    },
    ...pageParams(),
    includeToParam,
  ],
  output: [
    { key: "messageId", type: "number", label: "Message ID" },
    { key: "folderId", type: "number", label: "Folder ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "sender", type: "string", label: "Sender display name" },
    { key: "fromAddress", type: "string", label: "From address" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "status", type: "string", label: "Read status" },
    { key: "receivedtime", type: "number", label: "Received time (epoch ms)" },
    { key: "size", type: "number", label: "Size (bytes)" },
    { key: "hasAttachment", type: "number", label: "Has attachment (1/0)" },
    { key: "threadId", type: "number", label: "Thread ID" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const messages = await new ZohoMailClient(ctx).request<MessageSearchOutputItem[]>(
      `/accounts/${encodeURIComponent(accountId)}/messages/search`,
      {
        query: compact({
          searchKey: input.searchKey,
          receivedTime: input.receivedTime,
          start: input.start,
          limit: input.limit,
          includeto: input.includeto,
        }),
      },
    );
    return messages ?? [];
  },
};

export default messageSearch;
