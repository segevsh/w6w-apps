import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  groupId: string;
  status?: "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk";
  limit?: number;
  cursor?: string;
}

/**
 * `GET /api/groups/{group_id}/subscribers` — cursor paginated, like the
 * top-level subscribers collection it is a slice of.
 */
const listGroupSubscribers: ActionDefinition<Input> = {
  key: "list-group-subscribers",
  type: "read",
  resource: "group",
  title: "List Group Subscribers",
  description: "List the subscribers in a group. Pass `meta.next_cursor` back as `cursor`.",
  params: [
    { key: "groupId", label: "Group ID", type: "string", required: true },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "unconfirmed", label: "Unconfirmed" },
        { value: "bounced", label: "Bounced" },
        { value: "junk", label: "Junk" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    { key: "cursor", label: "Cursor", type: "string" },
  ],
  output: [
    { key: "data", type: "array", label: "Subscribers" },
    { key: "links", type: "object", label: "Page links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope<unknown[]>>(
      `/groups/${encodeURIComponent(input.groupId)}/subscribers`,
      {
        query: {
          "filter[status]": input.status,
          limit: input.limit ?? 25,
          cursor: input.cursor,
        },
      },
    );
  },
};

export default listGroupSubscribers;
