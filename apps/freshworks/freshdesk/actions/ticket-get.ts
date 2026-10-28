import type { ActionDefinition } from "@w6w/types";
import { FreshdeskClient } from "../lib/client.ts";
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
  description: "Fetch a single ticket by ID.",
  params: [
    { key: "ticketId", label: "Ticket ID", type: "number", required: true },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      advanced: true,
      options: [
        { value: "stats", label: "Stats" },
        { value: "requester", label: "Requester" },
        { value: "description", label: "Description" },
        { value: "company", label: "Company" },
      ],
    },
  ],
  output: ticketOutput,

  execute(input, ctx) {
    return new FreshdeskClient(ctx).request(`/tickets/${input.ticketId}`, {
      query: { include: input.include?.length ? input.include.join(",") : undefined },
    });
  },
};

export default ticketGet;
