import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one person by id (`GET /people/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const personGet: ActionDefinition<Input> = {
  key: "person-get",
  type: "read",
  resource: "person",
  title: "Get Person",
  description: "Get one person by id (`GET /people/{id}`).",
  params: [
    { key: "id", label: "Person ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Person"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/people/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default personGet;
