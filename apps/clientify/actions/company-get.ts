import type { ActionDefinition } from "@w6w/types";
import { ClientifyClient } from "../lib/client.ts";

/**
 * `GET /v1/companies/{companyId}/` — Get one company by id.
 */
interface Input {
  companyId: string;
}

const companyGet: ActionDefinition<Input, unknown> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Get one company by id.",
  params: [
    { key: "companyId", label: "Company ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Record id" },
    { key: "url", type: "string", label: "Record URL" },
    { key: "name", type: "string", label: "Company name" },
  ],

  execute(input, ctx) {
    const client = new ClientifyClient(ctx);
    return client.request(`/v1/companies/${encodeURIComponent(input.companyId)}/`, {
      method: "GET",
    });
  },
};

export default companyGet;
