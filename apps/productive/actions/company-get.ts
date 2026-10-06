import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one company by id (`GET /companies/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description: "Get one company by id (`GET /companies/{id}`).",
  params: [
    { key: "id", label: "Company ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Company"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/companies/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default companyGet;
