import type { ActionDefinition } from "@w6w/types";
import { AxonautClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /api/v2/companies/{companyId}` — Delete a company. The vendor answers 202 Accepted with no body.
 *
 * Verified against the OpenAPI document at `https://axonaut.com/api/v2/doc` (fetched 2026-10-06).
 */
interface Input {
  companyId: number;
}

const companyDelete: ActionDefinition<Input> = {
  key: "company-delete",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description: "Delete a company. The vendor answers 202 Accepted with no body.",
  idempotent: true,
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
    { key: "ok", type: "boolean", label: "True when accepted" },
  ],

  execute(input, ctx) {
    return new AxonautClient(ctx).one(`/companies/${encodeId(input.companyId)}`, {
      method: "DELETE",
    });
  },
};

export default companyDelete;
