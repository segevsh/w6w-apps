import type { ActionDefinition } from "@w6w/types";
import { accountIdFrom, compact, ZohoMailClient } from "../lib/client.ts";
import { accountIdParam, folderIdParam, messageIdParam } from "../lib/params.ts";

interface MessageHeaderGetInput {
  accountId?: string;
  folderId: string;
  messageId: string;
  raw?: boolean;
}

interface MessageHeaderGetOutput {
  messageId: string;
  /** A raw header block (string) when `raw` is true, a parsed object when false. */
  headerContent: unknown;
}

/**
 * `GET /api/accounts/{accountId}/folders/{folderId}/messages/{messageId}/header`
 * — "Get Message Headers of an Email". `raw` (default `true`, matching the
 * vendor's own default) selects the internet-message-header text block over
 * a parsed `{header: [values]}` object — `headerContent`'s shape depends on
 * it, which is why this action's output types it as opaque rather than
 * picking one shape and being wrong for the other.
 */
const messageHeaderGet: ActionDefinition<MessageHeaderGetInput, MessageHeaderGetOutput> = {
  key: "message-header-get",
  type: "read",
  resource: "message",
  title: "Get Email Headers",
  description: "Fetch the internet message headers of one email.",
  params: [
    accountIdParam,
    folderIdParam,
    messageIdParam,
    {
      key: "raw",
      label: "Raw text",
      type: "boolean",
      default: true,
      hint: "On (default) returns the raw RFC 822 header block as text. Off returns headers " +
        "parsed into a name -> value(s) object.",
    },
  ],
  output: [
    { key: "messageId", type: "string", label: "Message ID" },
    { key: "headerContent", type: "object", label: "Header content (string when Raw text is on)" },
  ],

  async execute(input, ctx) {
    const accountId = accountIdFrom(input, ctx);
    const headers = await new ZohoMailClient(ctx).request<MessageHeaderGetOutput>(
      `/accounts/${encodeURIComponent(accountId)}/folders/${encodeURIComponent(input.folderId)}` +
        `/messages/${encodeURIComponent(input.messageId)}/header`,
      { query: compact({ raw: input.raw }) },
    );
    if (!headers) throw new Error(`Zoho Mail returned no headers for message ${input.messageId}`);
    return headers;
  },
};

export default messageHeaderGet;
