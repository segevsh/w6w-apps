import type { ActionDefinition } from "@w6w/types";
import { CloseClient } from "../lib/client.ts";

interface Input {
  leadId: string;
  fields?: string;
}

/**
 * `GET /lead/{id}/` — one Lead.
 *
 * Close returns a Lead with its contacts, tasks, opportunities and populated
 * custom fields nested in; activities are NOT included and must be fetched via
 * the List Activities action. Smart Fields are also excluded by default —
 * `_fields=_all` reveals which exist, but Close recommends discovering them once
 * and then naming only the ones you need, since `_all` is the slow path.
 */
const getLead: ActionDefinition<Input> = {
  key: "get-lead",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description:
    "Fetch a single Lead by id, including its nested contacts, tasks, opportunities and custom " +
    "fields. Activities are not included — use List Activities for those.",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      placeholder: "lead_...",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      hint:
        "Comma-separated fields to return (`_fields`). `custom` for all custom fields; `_all` " +
        "also returns every Smart Field, which is slower.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Lead ID" }],

  execute(input, ctx) {
    return new CloseClient(ctx).request(`/lead/${encodeURIComponent(input.leadId)}/`, {
      query: { _fields: input.fields },
    });
  },
};

export default getLead;
