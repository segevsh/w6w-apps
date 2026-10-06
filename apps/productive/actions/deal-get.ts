import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one deal or budget by id (`GET /deals/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const dealGet: ActionDefinition<Input> = {
  key: "deal-get",
  type: "read",
  resource: "deal",
  title: "Get Deal or Budget",
  description: "Get one deal or budget by id (`GET /deals/{id}`).",
  params: [
    { key: "id", label: "Deal ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Deal"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/deals/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default dealGet;
