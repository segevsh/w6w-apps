import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /api/v2/tickets/{id}` — Fetch one support ticket by ID. */
interface Input {
  id: number;
}

const ticketGet: ActionDefinition<Input> = {
  key: "ticket-get",
  type: "read",
  resource: "ticket",
  title: "Get Ticket",
  description: "Fetch one support ticket by ID.",
  params: [idParam("id", "Ticket ID")],
  output: [{ key: "data", type: "object", label: "The ticket" }],

  async execute(input, ctx) {
    const data = await new UpsalesClient(ctx).data("GET", `/tickets/${encodeId(input.id)}`);
    return { data };
  },
};

export default ticketGet;
