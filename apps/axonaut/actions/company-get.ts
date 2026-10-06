import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `GET /api/v2/companies/{companyId}` — Get one company by id.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  companyId: number;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Get one company by id.",
  params: [
    {
      key: "companyId",
      label: "Company ID",
      type: "number",
      required: true,
      hint: "Numeric Axonaut id of the company.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Company ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_customer", type: "boolean", label: "Is customer" },
    { key: "is_prospect", type: "boolean", label: "Is prospect" },
    { key: "address_city", type: "string", label: "City" },
    { key: "custom_fields", type: "object", label: "Custom fields" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/companies/${encodeId(input.companyId)}`);
  },
};

export default companyGet;
