import type { ActionDefinition } from "@w6w/types";
import { call, parseJson, pick, ticketPath } from "../lib/client.ts";
import { bool, int, json, select, str } from "../lib/params.ts";

/** `PATCH /tickets/{ticketId}` -> 204. */
type Input = {
  ticket_id: number;
  status?: string;
  priority?: string;
  assigned_type?: string;
  assigned_id?: string;
  unassign?: boolean;
  tag_ids?: unknown;
  custom_fields?: unknown;
};

const ticketUpdate: ActionDefinition<Input> = {
  key: "ticket-update",
  type: "perform",
  resource: "ticket",
  title: "Update Ticket",
  description:
    "Change a ticket's status, priority, assignee, tags or custom fields. Only the fields you set are sent.",
  idempotent: true,
  params: [
    int("ticket_id", "Ticket ID", { required: true, validation: { min: 1 } }),
    select("status", "Status", ["open", "pending", "solved"]),
    select("priority", "Priority", ["low", "normal", "urgent"]),
    select("assigned_type", "Assign to", ["department", "operator"], {
      hint: "Set together with the assignee ID.",
    }),
    str("assigned_id", "Assignee ID", { hint: "Department or operator UUID." }),
    bool("unassign", "Unassign", { hint: "Send assigned: null to clear the assignment." }),
    json("tag_ids", "Tag IDs", {
      hint: "REPLACES the ticket's whole tag set; an empty array removes all tags.",
    }),
    json("custom_fields", "Custom fields", {
      hint: 'Merge semantics: [{"id":"<ulid>","value":"..."}]; value null removes a stored value.',
    }),
  ],
  output: [
    { key: "updated", type: "boolean", label: "True when Tidio accepted the update" },
    { key: "id", type: "number", label: "Ticket ID" },
  ],
  async execute(input, ctx) {
    const id = ticketPath(input.ticket_id);
    const body: Record<string, unknown> = pick(input, ["status", "priority"]);
    if (input.unassign) {
      body.assigned = null;
    } else if (input.assigned_type || input.assigned_id) {
      if (!input.assigned_type || !input.assigned_id) {
        throw new Error("assigned_type and assigned_id must be set together");
      }
      body.assigned = { type: input.assigned_type, id: input.assigned_id };
    }
    if (input.tag_ids !== undefined && input.tag_ids !== "") {
      body.tag_ids = parseJson(input.tag_ids, "tag_ids");
    }
    if (input.custom_fields !== undefined && input.custom_fields !== "") {
      body.custom_fields = parseJson(input.custom_fields, "custom_fields");
    }
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update: set at least one field");
    }
    await call(ctx, "PATCH", `/tickets/${id}`, { body });
    return { updated: true, id: Number(id) };
  },
};

export default ticketUpdate;
