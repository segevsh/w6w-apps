import type { ActionDefinition } from "@w6w/types";
import { compact, PipedriveClient } from "../lib/client.ts";

interface Input {
  title: string;
  personId?: number;
  organizationId?: number;
  ownerId?: number;
  amount?: number;
  currency?: string;
  expectedCloseDate?: string;
  labelIds?: unknown;
}

/**
 * POST /leads — create a lead. `title` is required; a lead should link to at
 * least one of a person or an organization. The monetary value is a nested
 * `{ amount, currency }` object, built here only when an amount is supplied.
 */
const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description: "Create a new lead linked to a person and/or organization.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "personId", label: "Person ID", type: "number" },
    { key: "organizationId", label: "Organization ID", type: "number" },
    { key: "ownerId", label: "Owner (user ID)", type: "number" },
    { key: "amount", label: "Value amount", type: "number", row: "value" },
    {
      key: "currency",
      label: "Value currency",
      type: "string",
      row: "value",
      hint: "3-letter code, e.g. USD.",
    },
    { key: "expectedCloseDate", label: "Expected close date", type: "date", hint: "YYYY-MM-DD." },
    { key: "labelIds", label: "Label IDs", type: "json", hint: "Array of lead-label UUIDs." },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "data", type: "object", label: "Lead" },
  ],

  execute(input, ctx) {
    const client = new PipedriveClient(ctx);
    const value = input.amount === undefined
      ? undefined
      : { amount: input.amount, currency: input.currency ?? "USD" };
    return client.request("/leads", {
      method: "POST",
      body: compact({
        title: input.title,
        person_id: input.personId,
        organization_id: input.organizationId,
        owner_id: input.ownerId,
        value,
        expected_close_date: input.expectedCloseDate,
        label_ids: input.labelIds,
      }),
    });
  },
};

export default leadCreate;
