import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, pageParams, ticketId } from "../lib/params.ts";

interface Input extends DeskListInput {
  ticketId: string;
  include?: string;
  sortBy?: string;
}

const ticketCommentList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "ticket-comment-list",
  type: "read",
  resource: "ticket-comment",
  title: "List Ticket Comments",
  description: "List comments on a ticket, with pagination support.",
  params: [
    ticketId,
    orgId,
    { key: "include", label: "Include", type: "string", hint: "Supported value: mentions." },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "commentedTime. Prefix with - for descending.",
    },
    ...pageParams,
  ],
  output: [{ key: "data", type: "array", label: "Comments" }],

  execute(input, ctx) {
    return deskList(ctx, `/tickets/${encodeURIComponent(input.ticketId)}/comments`, input, {
      include: input.include,
      sortBy: input.sortBy,
    });
  },
};

export default ticketCommentList;
