import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  status?: "active" | "unsubscribed" | "unconfirmed" | "bounced" | "junk";
  limit?: number;
  cursor?: string;
  includeGroups?: boolean;
}

/**
 * `GET /api/subscribers` — CURSOR paginated, not page/limit. Read
 * `meta.next_cursor` off the envelope and hand it back as `cursor` for the
 * next page.
 */
const listSubscribers: ActionDefinition<Input> = {
  key: "list-subscribers",
  type: "read",
  resource: "subscriber",
  title: "List Subscribers",
  description: "List subscribers. Walks one page — pass `meta.next_cursor` back as `cursor`.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Omit to return every status.",
      options: [
        { value: "active", label: "Active" },
        { value: "unsubscribed", label: "Unsubscribed" },
        { value: "unconfirmed", label: "Unconfirmed" },
        { value: "bounced", label: "Bounced" },
        { value: "junk", label: "Junk" },
      ],
    },
    { key: "limit", label: "Limit", type: "number", default: 25 },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "Opaque cursor from a previous response's `meta.next_cursor`.",
    },
    {
      key: "includeGroups",
      label: "Include groups",
      type: "boolean",
      default: false,
      hint: "Side-loads each subscriber's groups. `groups` is the only value MailerLite supports.",
    },
  ],
  output: [
    { key: "data", type: "array", label: "Subscribers" },
    { key: "links", type: "object", label: "Page links" },
    { key: "meta", type: "object", label: "Pagination meta" },
  ],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    return client.request<MailerLiteEnvelope<unknown[]>>("/subscribers", {
      query: {
        "filter[status]": input.status,
        limit: input.limit ?? 25,
        cursor: input.cursor,
        include: input.includeGroups ? "groups" : undefined,
      },
    });
  },
};

export default listSubscribers;
