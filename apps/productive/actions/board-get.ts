import type { ActionDefinition } from "@w6w/types";
import { encodeId, ProductiveClient } from "../lib/client.ts";
import { includeParam, resourceOutput } from "../lib/params.ts";

/**
 * Get one board by id (`GET /boards/{id}`).
 *
 * Verified 2026-10-06 against the vendor OpenAPI document (`api-master.yaml`).
 */
interface Input {
  id: string | number;
  include?: string;
}

const boardGet: ActionDefinition<Input> = {
  key: "board-get",
  type: "read",
  resource: "board",
  title: "Get Board",
  description: "Get one board by id (`GET /boards/{id}`).",
  params: [
    { key: "id", label: "Board ID", type: "string", required: true },
    includeParam,
  ],
  output: resourceOutput("Board"),

  async execute(input, ctx) {
    return await new ProductiveClient(ctx).one(`/boards/${encodeId(input.id)}`, {
      query: { include: input.include },
    });
  },
};

export default boardGet;
