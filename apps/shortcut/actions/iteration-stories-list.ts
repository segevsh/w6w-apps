import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { includesDescriptionParam, iterationIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3/iterations/{iterationId}/stories` — every Story in an Iteration.
 * Answers a bare, unbounded array.
 */
interface Input {
  iterationId: number;
  includesDescription?: boolean;
}

const iterationStoriesList: ActionDefinition<Input> = {
  key: "iteration-stories-list",
  type: "search",
  resource: "iteration",
  title: "List Iteration's Stories",
  description: "List every Story scheduled in an Iteration.",
  params: [iterationIdParam, includesDescriptionParam],
  output: [{ key: "data", type: "array", label: "Stories" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(
      `/iterations/${input.iterationId}/stories`,
      compact({ includes_description: input.includesDescription }),
    );
  },
};

export default iterationStoriesList;
