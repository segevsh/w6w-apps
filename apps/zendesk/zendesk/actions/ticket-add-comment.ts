import type { ActionDefinition } from "@w6w/types";
import { unset, ZendeskClient } from "../lib/client.ts";
import { ticketOutput } from "../lib/params.ts";

interface Input {
  ticketId: number;
  body: string;
  public?: boolean;
  authorId?: number;
  status?: string;
}

/**
 * A comment is a ticket update in Zendesk's model, so this is a PUT on the
 * ticket rather than a POST to a comments collection.
 */
const ticketAddComment: ActionDefinition<Input> = {
  key: "ticket-add-comment",
  type: "perform",
  resource: "ticket",
  title: "Add Comment to Ticket",
  description: "Reply to a ticket, publicly or as an internal note.",
  // Each call appends another comment.
  idempotent: false,
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    { key: "body", label: "Comment", type: "text", required: true, config: { multiline: true } },
    {
      key: "public",
      label: "Public",
      type: "boolean",
      default: true,
      hint: "Off makes it an internal note the requester cannot see.",
    },
    {
      key: "authorId",
      label: "Author ID",
      type: "number",
      advanced: true,
      hint: "Post as this agent. Defaults to the connected account.",
    },
    {
      key: "status",
      label: "Set status",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "pending", label: "Pending" },
        { value: "solved", label: "Solved" },
      ],
      hint: "Optionally move the ticket at the same time.",
    },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new ZendeskClient(ctx).request(`/tickets/${input.ticketId}.json`, {
      method: "PUT",
      body: {
        ticket: {
          comment: {
            body: input.body,
            // Explicit, not `?? true` — `false` is the meaningful case here and
            // must survive rather than being treated as unset.
            public: input.public !== false,
            author_id: input.authorId,
          },
          status: unset(input.status),
        },
      },
    });
  },
};

export default ticketAddComment;
