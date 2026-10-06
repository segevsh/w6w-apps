import type { ActionDefinition } from "@w6w/types";
import { call, parseJson, pick } from "../lib/client.ts";
import { json, str, text } from "../lib/params.ts";

/** `POST /tickets/as-contact` -> 201 `{id}` (integer). */
type Input = {
  contact_email: string;
  subject: string;
  message_content: string;
  assigned_department_id?: string;
  custom_channel_id?: string;
  tag_ids?: unknown;
  custom_fields?: unknown;
};

const ticketCreate: ActionDefinition<Input> = {
  key: "ticket-create",
  type: "perform",
  resource: "ticket",
  title: "Create Ticket",
  description:
    "Create a ticket as a contact. Without a department the General department is assigned.",
  idempotent: false,
  params: [
    str("contact_email", "Contact email", { required: true }),
    str("subject", "Subject", { required: true }),
    text("message_content", "Message", { required: true, hint: "The first ticket message." }),
    str("assigned_department_id", "Department ID", {
      hint: "UUID from List Departments. Defaults to General.",
    }),
    str("custom_channel_id", "Custom channel ID"),
    json("tag_ids", "Tag IDs", { hint: "Array of integer tag IDs from List Ticket Tags." }),
    json("custom_fields", "Custom fields", {
      hint: 'Array: [{"id":"<ulid>","value":"..."}], IDs from List Ticket Custom Fields.',
    }),
  ],
  output: [{ key: "id", type: "number", label: "New ticket ID" }],
  async execute(input, ctx) {
    const body: Record<string, unknown> = pick(input, [
      "contact_email",
      "subject",
      "message_content",
      "assigned_department_id",
      "custom_channel_id",
    ]);
    if (input.tag_ids !== undefined && input.tag_ids !== "") {
      body.tag_ids = parseJson(input.tag_ids, "tag_ids");
    }
    if (input.custom_fields !== undefined && input.custom_fields !== "") {
      body.custom_fields = parseJson(input.custom_fields, "custom_fields");
    }
    const res = await call(ctx, "POST", "/tickets/as-contact", { body });
    return { id: (res as { id?: number } | null)?.id ?? null };
  },
};

export default ticketCreate;
