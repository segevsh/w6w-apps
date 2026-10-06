import type { ActionDefinition } from "@w6w/types";
import { call, pick, ticketPath } from "../lib/client.ts";
import { int, select, str, text } from "../lib/params.ts";

/** `POST /tickets/{ticketId}/reply` -> 201 `{id}`. */
type Input = {
  ticket_id: number;
  author_type: string;
  content: string;
  operator_id?: string;
  message_type?: string;
};

const ticketReply: ActionDefinition<Input> = {
  key: "ticket-reply",
  type: "perform",
  resource: "ticket",
  title: "Reply To Ticket",
  description:
    "Add a reply to a ticket as an operator or as the contact. Internal notes are supported.",
  idempotent: false,
  params: [
    int("ticket_id", "Ticket ID", { required: true, validation: { min: 1 } }),
    select("author_type", "Author", ["operator", "contact"], { required: true }),
    text("content", "Content", { required: true }),
    str("operator_id", "Operator ID", {
      hint: "UUID of the replying operator (for author operator).",
    }),
    select("message_type", "Visibility", ["public", "internal"], {
      hint: "internal is a note the contact does not see.",
    }),
  ],
  output: [{ key: "id", type: "string", label: "New message ID" }],
  async execute(input, ctx) {
    const res = await call(ctx, "POST", `/tickets/${ticketPath(input.ticket_id)}/reply`, {
      body: pick(input, ["author_type", "content", "operator_id", "message_type"]),
    });
    return { id: (res as { id?: string } | null)?.id ?? null };
  },
};

export default ticketReply;
