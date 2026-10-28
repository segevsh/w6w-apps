import type { ActionDefinition } from "@w6w/types";
import { FreshserviceClient } from "../lib/client.ts";
import { ticketOutput } from "../lib/params.ts";

interface Input {
  ticketId: number;
  include?: string[];
}

const ticketGet: ActionDefinition<Input> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch one ticket by ID.",
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    {
      key: "include",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      hint:
        "v2 omits these by default. Each one costs an extra API credit, and conversations cost two.",
      options: [
        { value: "conversations", label: "Conversations (first 10)" },
        { value: "requester", label: "Requester" },
        { value: "requested_for", label: "Requested for" },
        { value: "stats", label: "Stats (resolved/closed/first-responded times)" },
        { value: "problem", label: "Associated problem" },
        { value: "assets", label: "Associated assets" },
        { value: "changes", label: "Associated changes" },
        { value: "related_tickets", label: "Related tickets" },
      ],
    },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    const include = input.include?.length ? input.include.join(",") : undefined;
    return new FreshserviceClient(ctx).resource("ticket", `/tickets/${input.ticketId}`, {
      query: { include },
    });
  },
};

export default ticketGet;
