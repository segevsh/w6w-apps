import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { epicIdParam, includesDescriptionParam } from "../lib/params.ts";

/**
 * `GET /api/v3/epics/{epicId}/stories` — every Story in an Epic.
 *
 * Answers a bare, unbounded array — this endpoint has no pagination
 * parameters at all.
 */
interface Input {
  epicId: number;
  includesDescription?: boolean;
}

const epicStoriesList: ActionDefinition<Input> = {
  key: "epic-stories-list",
  type: "search",
  resource: "epic",
  title: "List Epic's Stories",
  description: "List every Story that belongs to an Epic.",
  params: [epicIdParam, includesDescriptionParam],
  output: [{ key: "data", type: "array", label: "Stories" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(
      `/epics/${input.epicId}/stories`,
      compact({ includes_description: input.includesDescription }),
    );
  },
};

export default epicStoriesList;
