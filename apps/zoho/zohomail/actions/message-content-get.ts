import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam, folderIdParam, messageIdParam } from "../lib/params.ts";

interface MessageContentGetInput {
  accountId?: string;
  folderId: string;
  messageId: string;
  includeBlockContent?: boolean;
}

interface MessageContentGetOutput {
  messageId: string;
  content: string;
}

/**
 * `GET /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/content`
 * — "Get Email Content of an Email". The HTML/plaintext body. `content` is
 * whatever the vendor stored — this app does not sanitize it (rendering, if
 * any, is the workflow's own step).
 */
const messageContentGet: ActionDefinition<MessageContentGetInput, MessageContentGetOutput> = {
  key: "message-content-get",
  type: "read",
  resource: "message",
  title: "Get Email Content",
  description: "Fetch one email's body content.",
  params: [
    accountIdParam,
    folderIdParam,
    messageIdParam,
    {
      key: "includeBlockContent",
      label: "Include quoted content",
      type: "boolean",
      hint: "When this email is a reply, include the quoted parent content as well as the reply " +
        "itself. Off by default — only the reply is returned.",
    },
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "content", type: "string", label: "Content" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const body = await new ZohoMailClient(ctx).request<MessageContentGetOutput>(
      `/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(input.folderId)}` +
        `/messages/${encodeURIComponent(input.messageId)}/content`,
      { query: compact({ includeBlockContent: input.includeBlockContent }) },
    );
    if (!body) throw new Error(`Zoho Mail returned no content for message ${input.messageId}`);
    return body;
  },
};

export default messageContentGet;
