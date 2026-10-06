import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, PylonClient, strList } from "../lib/client.ts";
import { customFieldsParam, ISSUE_OUTPUT } from "../lib/params.ts";

interface Input {
  title: string;
  bodyHtml: string;
  accountId?: string;
  requesterEmail?: string;
  requesterName?: string;
  requesterId?: string;
  assigneeId?: string;
  teamId?: string;
  priority?: string;
  tags?: string[] | string;
  customFields?: unknown;
  contactId?: string;
  userId?: string;
  attachmentUrls?: string[] | string;
  destination?: string;
  destinationEmail?: string;
}

/**
 * `POST /issues` — creates an issue and its first message. Needs `title` and `body_html`, plus an
 * account or requester. With no `destination_metadata` the first message is an INTERNAL NOTE and
 * nobody is contacted; set a destination to deliver it to the customer.
 */
const issueCreate: ActionDefinition<Input> = {
  key: "issue-create",
  type: "perform",
  resource: "issue",
  title: "Create Issue",
  description:
    "Create an issue with its first message. Needs an account or a requester. Unless a destination is set, the first message is an internal note and no customer is contacted.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "bodyHtml", label: "Body (HTML)", type: "text", required: true },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "Required unless a requester is given.",
    },
    {
      key: "requesterEmail",
      label: "Requester email",
      type: "string",
      hint: "Finds or creates the contact (in the account, when one is given).",
    },
    { key: "requesterName", label: "Requester name", type: "string" },
    { key: "requesterId", label: "Requester contact ID", type: "string" },
    { key: "assigneeId", label: "Assignee user ID", type: "string" },
    { key: "teamId", label: "Team ID", type: "string" },
    {
      key: "priority",
      label: "Priority",
      type: "select",
      options: [
        { value: "urgent", label: "Urgent" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
    customFieldsParam("issue"),
    {
      key: "destination",
      label: "Deliver first message via",
      type: "select",
      hint: "Leave empty for an internal note. Email additionally needs the email below.",
      options: [
        { value: "email", label: "Email" },
        { value: "slack", label: "Slack" },
        { value: "in_app_chat", label: "In-app chat" },
        { value: "customer_portal", label: "Customer portal" },
        { value: "internal", label: "Internal" },
        { value: "sms", label: "SMS" },
        { value: "whatsapp", label: "WhatsApp" },
      ],
    },
    { key: "destinationEmail", label: "Destination email", type: "string" },
    {
      key: "contactId",
      label: "Author contact ID",
      type: "string",
      hint: "Attribute the first message to this contact. Exclusive with the author user.",
    },
    {
      key: "userId",
      label: "Author user ID",
      type: "string",
      hint: "Attribute the first message to this user. Defaults to the API token's user.",
    },
    { key: "attachmentUrls", label: "Attachment URLs", type: "array", item: { type: "string" } },
  ],
  output: ISSUE_OUTPUT,

  execute(input, ctx) {
    const destination = input.destination
      ? compact({ destination: input.destination, email: input.destinationEmail || undefined })
      : undefined;
    return new PylonClient(ctx).one("POST", "/issues", {
      body: compact({
        title: input.title,
        body_html: input.bodyHtml,
        account_id: input.accountId,
        requester_email: input.requesterEmail,
        requester_name: input.requesterName,
        requester_id: input.requesterId,
        assignee_id: input.assigneeId,
        team_id: input.teamId,
        priority: input.priority || undefined,
        tags: strList(input.tags),
        custom_fields: customFields(input.customFields),
        destination_metadata: destination,
        contact_id: input.contactId,
        user_id: input.userId,
        attachment_urls: strList(input.attachmentUrls),
      }),
    });
  },
};

export default issueCreate;
