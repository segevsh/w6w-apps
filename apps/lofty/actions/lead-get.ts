import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/leads/{leadId}` — one lead.
 *
 * ## The wrapper is ambiguous, so both shapes are accepted
 *
 * The published operation description says the response is "wrapped under the
 * `lead` key", but the documented 200 schema lists the lead's own fields
 * (`leadId`, `firstName`, `emails`, `tags`, …) at the top level. Rather than
 * pick one and break on the other, this action returns the inner object when a
 * `lead` key holds one and the body otherwise — the same fields either way.
 *
 * `withTrash` includes a trashed lead in the lookup, which is how a workflow
 * confirms what a Delete Lead actually moved.
 */
interface Input {
  leadId: number;
  withTrash?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Fetch one lead by id, optionally including a trashed one " +
    "(GET /v1.0/leads/{leadId}).",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "number",
      required: true,
      hint: "The `leadId` from a List Leads or Create Lead result.",
    },
    {
      key: "withTrash",
      label: "Include trashed leads",
      type: "boolean",
      hint: "Look up a lead that Delete Lead has moved to the trash.",
    },
  ],
  output: [
    { key: "leadId", type: "number", label: "Lead ID" },
    { key: "firstName", type: "string", label: "First name" },
    { key: "lastName", type: "string", label: "Last name" },
    { key: "emails", type: "array", label: "Emails" },
    { key: "phones", type: "array", label: "Phones" },
    { key: "stage", type: "string", label: "Pipeline stage" },
    { key: "assignedUserId", type: "number", label: "Assigned user ID" },
    { key: "tags", type: "array", label: "Tags" },
  ],

  async execute(input, ctx) {
    const body = await new LoftyClient(ctx).request<Record<string, unknown>>(
      `/leads/${input.leadId}`,
      { query: { withTrash: input.withTrash } },
    );
    const inner = body?.lead;
    return inner && typeof inner === "object" ? inner as Record<string, unknown> : body;
  },
};

export default action;
