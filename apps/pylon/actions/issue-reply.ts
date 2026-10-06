import type { ActionDefinition } from "@w6w/types";
import { compact, PylonClient, seg, strList } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
  messageId: string;
  bodyHtml: string;
  toEmails?: string[] | string;
  ccEmails?: string[] | string;
  bccEmails?: string[] | string;
  userId?: string;
  contactId?: string;
  attachmentUrls?: string[] | string;
}

/**
 * `POST /issues/{id}/reply` — a CUSTOMER-FACING reply. `message_id` is required and must be the
 * top-level `id` of a customer-visible message on this issue (from `GET /issues/{id}/messages`),
 * not an internal note, a `thread_id`, or `email_info.message_id`. An email conversation needs at
 * least one recipient across to/cc/bcc; the referenced message's recipients are not copied.
 */
const issueReply: ActionDefinition<Input> = {
  key: "issue-reply",
  type: "perform",
  resource: "message",
  title: "Reply to Issue",
  description:
    "Send a customer-facing reply on an issue, visible to the requester. Use Post Internal Note for a private one.",
  idempotent: false,
  params: [
    idParam("Issue ID or number"),
    {
      key: "messageId",
      label: "Message ID to reply to",
      type: "string",
      required: true,
      hint:
        "The top-level `id` of a customer-visible message from List Issue Messages. Not a thread ID, an email message ID or an internal note.",
    },
    { key: "bodyHtml", label: "Body (HTML)", type: "text", required: true },
    {
      key: "toEmails",
      label: "To emails",
      type: "array",
      item: { type: "string" },
      hint: "Email conversations need at least one recipient across To, Cc and Bcc.",
    },
    { key: "ccEmails", label: "Cc emails", type: "array", item: { type: "string" } },
    { key: "bccEmails", label: "Bcc emails", type: "array", item: { type: "string" } },
    {
      key: "userId",
      label: "Post as user ID",
      type: "string",
      hint: "Exclusive with the contact. Defaults to the API token's user.",
    },
    { key: "contactId", label: "Post as contact ID", type: "string" },
    { key: "attachmentUrls", label: "Attachment URLs", type: "array", item: { type: "string" } },
  ],
  output: [
    { key: "id", type: "string", label: "New message ID" },
    { key: "issue_id", type: "string", label: "Issue ID" },
  ],

  execute(input, ctx) {
    const to = strList(input.toEmails);
    const cc = strList(input.ccEmails);
    const bcc = strList(input.bccEmails);
    const emailInfo = to || cc || bcc
      ? compact({ to_emails: to, cc_emails: cc, bcc_emails: bcc })
      : undefined;
    return new PylonClient(ctx).one("POST", `/issues/${seg(input.id)}/reply`, {
      body: compact({
        message_id: input.messageId,
        body_html: input.bodyHtml,
        email_info: emailInfo,
        user_id: input.userId,
        contact_id: input.contactId,
        attachment_urls: strList(input.attachmentUrls),
      }),
    });
  },
};

export default issueReply;
