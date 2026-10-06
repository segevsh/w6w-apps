import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one service by id (`GET /services/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const serviceGet: ActionDefinition<Input> = {
  key: "service-get",
  type: "read",
  resource: "service",
  title: "Get Service",
  description: "Get one service by id (`GET /services/{id}`).",
  params: [
    { key: "id", label: "Service ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Service"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/services/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default serviceGet;
