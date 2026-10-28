import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import {
  accountIdParam,
  flagIdOptions,
  includeToParam,
  messageStatusOptions,
  pageParams,
  sortByOptions,
} from "../lib/params.ts";

interface MessageListInput {
  accountId?: string;
  folderId?: string;
  start?: number;
  limit?: number;
  status?: string;
  flagid?: number;
  labelid?: string;
  threadId?: string;
  sortBy?: string;
  sortorder?: boolean;
  includeto?: boolean;
  includesent?: boolean;
  includearchive?: boolean;
  attachedMails?: boolean;
  flaggedMails?: boolean;
  threadedMails?: boolean;
}

interface MessageListOutputItem {
  messageId: string;
  folderId: string;
  subject: string;
  sender: string;
  fromAddress: string;
  summary: string;
  status: string;
  receivedTime: string;
  size: number;
  hasAttachment: string;
  threadId: string;
}

/**
 * `GET /api/accounts/{accountId}/messages/view` — "List Emails". Reads a
 * folder's contents, or applies the filters (status/flag/label/thread) the
 * vendor documents on top of it.
 */
const messageList: ActionDefinition<MessageListInput, MessageListOutputItem[]> = {
  key: "message-list",
  type: "read",
  resource: "message",
  title: "List Emails",
  description: "List emails in a folder, or filtered by status, flag, label or thread.",
  params: [
    accountIdParam,
    {
      key: "folderId",
      label: "Folder ID",
      type: "string",
      hint: "Leave empty to list across every folder. Use Get Folders to find an id.",
    },
    ...pageParams(),
    { key: "status", label: "Status", type: "select", options: messageStatusOptions },
    { key: "flagid", label: "Flag", type: "select", options: flagIdOptions, advanced: true },
    { key: "labelid", label: "Label ID", type: "string", advanced: true },
    { key: "threadId", label: "Thread ID", type: "string", advanced: true },
    { key: "sortBy", label: "Sort by", type: "select", default: "date", options: sortByOptions },
    {
      key: "sortorder",
      label: "Ascending order",
      type: "boolean",
      hint: "Off (default) returns newest first.",
    },
    includeToParam,
    { key: "includesent", label: "Include sent emails", type: "boolean", advanced: true },
    { key: "includearchive", label: "Include archived emails", type: "boolean", advanced: true },
    {
      key: "attachedMails",
      label: "Only emails with attachments",
      type: "boolean",
      advanced: true,
    },
    { key: "flaggedMails", label: "Only flagged emails", type: "boolean", advanced: true },
    { key: "threadedMails", label: "Only threaded emails", type: "boolean", advanced: true },
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "folderId", type: "string", label: "Folder ID" },
    { key: "subject", type: "string", label: "Subject" },
    { key: "sender", type: "string", label: "Sender display name" },
    { key: "fromAddress", type: "string", label: "From address" },
    { key: "summary", type: "string", label: "Summary" },
    { key: "status", type: "string", label: "Read status" },
    { key: "receivedTime", type: "string", label: "Received time (epoch ms)" },
    { key: "size", type: "number", label: "Size (bytes)" },
    { key: "hasAttachment", type: "string", label: "Has attachment" },
    { key: "threadId", type: "string", label: "Thread ID" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const messages = await new ZohoMailClient(ctx).request<MessageListOutputItem[]>(
      `/accounts/${encodeURIComponent(accountId)}/messages/view`,
      {
        query: compact({
          folderId: input.folderId,
          start: input.start,
          limit: input.limit,
          status: input.status,
          flagid: input.flagid,
          labelid: input.labelid,
          threadId: input.threadId,
          sortBy: input.sortBy,
          sortorder: input.sortorder,
          includeto: input.includeto,
          includesent: input.includesent,
          includearchive: input.includearchive,
          attachedMails: input.attachedMails,
          flaggedMails: input.flaggedMails,
          threadedMails: input.threadedMails,
        }),
      },
    );
    return messages ?? [];
  },
};

export default messageList;
