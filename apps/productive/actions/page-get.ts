import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one Docs page by id (`GET /pages/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const pageGet: ActionDefinition<Input> = {
  key: "page-get",
  type: "read",
  resource: "page",
  title: "Get Docs Page",
  description: "Get one Docs page by id (`GET /pages/{id}`).",
  params: [
    { key: "id", label: "Page ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Page"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/pages/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default pageGet;
