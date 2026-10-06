import type { ActionDefinition } from "@w6w/types";
import { compact, customFields, PylonClient, seg, strList } from "../lib/client.ts";
import { customFieldsParam, idParam, ISSUE_OUTPUT } from "../lib/params.ts";

interface Input {
  id: string;
  title?: string;
  state?: string;
  assigneeId?: string;
  teamId?: string;
  accountId?: string;
  requesterId?: string;
  tags?: string[] | string;
  customFields?: unknown;
  type?: string;
  customerPortalVisible?: boolean;
}

/**
 * `PATCH /issues/{id}` — only provided fields change. An empty string clears the assignee, team,
 * account (which also needs `requester_id`) or requester. `requestor_id` is deprecated and is not
 * exposed.
 */
const issueUpdate: ActionDefinition<Input> = {
  key: "issue-update",
  type: "perform",
  resource: "issue",
  title: "Update Issue",
  description:
    "Change an issue's title, state, assignee, team, account, requester, tags or custom fields. Only the fields you set change.",
  idempotent: true,
  params: [
    idParam("Issue ID"),
    { key: "title", label: "Title", type: "string" },
    {
      key: "state",
      label: "State",
      type: "string",
      hint:
        "new, waiting_on_you, waiting_on_customer, on_hold or closed; a custom status slug also works (see List Issue Statuses).",
    },
    {
      key: "assigneeId",
      label: "Assignee user ID",
      type: "string",
      hint: "An empty string removes the assignee.",
    },
    {
      key: "teamId",
      label: "Team ID",
      type: "string",
      hint: "An empty string removes the team.",
    },
    {
      key: "accountId",
      label: "Account ID",
      type: "string",
      hint: "An empty string removes the account, and then Requester ID must be set too.",
    },
    {
      key: "requesterId",
      label: "Requester contact ID",
      type: "string",
      hint: "An empty string removes the requester.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Replaces the issue's tags with exactly this list.",
    },
    customFieldsParam("issue"),
    {
      key: "type",
      label: "Type",
      type: "select",
      hint: "A conversation can be upgraded to a ticket, never back.",
      options: [
        { value: "conversation", label: "Conversation" },
        { value: "ticket", label: "Ticket" },
      ],
    },
    { key: "customerPortalVisible", label: "Visible in customer portal", type: "boolean" },
  ],
  output: ISSUE_OUTPUT,

  execute(input, ctx) {
    return new PylonClient(ctx).one("PATCH", `/issues/${seg(input.id)}`, {
      body: compact({
        title: input.title,
        state: input.state,
        assignee_id: input.assigneeId,
        team_id: input.teamId,
        account_id: input.accountId,
        requester_id: input.requesterId,
        tags: input.tags === undefined ? undefined : (strList(input.tags) ?? []),
        custom_fields: customFields(input.customFields),
        type: input.type || undefined,
        customer_portal_visible: input.customerPortalVisible,
      }),
    });
  },
};

export default issueUpdate;
