import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `DELETE /v1/companies/{companyId}/` — Delete a company. Clientify answers 204 with no body, so the action returns `{ deleted: true, id }`.
 */
interface Input {
  companyId: string;
}

const companyDelete: ActionDefinition<Input, unknown> = {
  key: "company-delete",
  type: "perform",
  resource: "company",
  title: "Delete Company",
  description:
    "Delete a company. Clientify answers 204 with no body, so the action returns `{ deleted: true, id }`.",
  idempotent: true,
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
  ],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "id", type: "string", label: "Deleted record id" },
  ],

  async execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    await client.request(`/v1/companies/${encodeURIComponent(input.companyId)}/`, {
      method: "DELETE",
    });
    return { deleted: true, id: input.companyId };
  },
};

export default companyDelete;
