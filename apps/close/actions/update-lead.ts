import type { ActionDefinition } from "@w6w/types";
import { CloseClient, compact, CUSTOM_FIELDS_PARAM, withCustomFields } from "../lib/client.ts";

interface Input {
  leadId: string;
  name?: string;
  url?: string;
  description?: string;
  statusId?: string;
  customFields?: Record<string, unknown> | null;
}

/**
 * `PUT /lead/{id}/` — update a Lead.
 *
 * Close's PUT is a PATCH in behaviour: its API overview states plainly that "PUT
 * requests function as patches (partial updates)". Fields you do not send are
 * left alone rather than cleared, which is why the body is `compact`ed — an
 * omitted param must not travel as an explicit `null` and blank a field the
 * caller never mentioned. Sending an explicit `null` still clears a field, on
 * purpose.
 *
 * Idempotent: applying the same field values twice leaves the Lead in the same
 * state, so a retry after a network failure is safe.
 */
const updateLead: ActionDefinition<Input> = {
  key: "update-lead",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description:
    "Update a Lead. Close treats PUT as a partial update, so only the fields you supply change.",
  idempotent: true,
  params: [
    { key: "leadId", label: "Lead ID", type: "string", required: true, placeholder: "lead_..." },
    { key: "name", label: "Name", type: "string" },
    { key: "url", label: "URL", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "statusId",
      label: "Status ID",
      type: "string",
      placeholder: "stat_...",
      hint: "Lead status id from the List Statuses action. Moving a Lead's stage is this field.",
    },
    CUSTOM_FIELDS_PARAM,
  ],
  output: [{ key: "id", type: "string", label: "Lead ID" }],

  execute(input, ctx) {
    const body = withCustomFields(
      compact({
        name: input.name,
        url: input.url,
        description: input.description,
        status_id: input.statusId,
      }),
      input.customFields,
    );
    return new CloseClient(ctx).request(`/lead/${encodeURIComponent(input.leadId)}/`, {
      method: "PUT",
      body,
    });
  },
};

export default updateLead;
