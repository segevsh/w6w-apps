import type { ActionDefinition } from "@w6w/types";
import { IntercomClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * GET /companies/{id} — fetch a company by its Intercom id (the `id` field, not
 * your own `company_id`; to look up by `company_id` use List Companies with the
 * `company_id` filter).
 */
const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Retrieve a single company by its Intercom company ID.",
  params: [
    {
      key: "id",
      label: "Intercom Company ID",
      type: "string",
      required: true,
      hint: "The Intercom `id`, e.g. `5f7e1b...`. Not your own company_id.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Intercom company ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new IntercomClient(ctx).request(`/companies/${encodeURIComponent(input.id)}`);
  },
};

export default companyGet;
