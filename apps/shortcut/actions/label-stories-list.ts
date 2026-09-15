import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";
import { includesDescriptionParam, labelIdParam } from "../lib/params.ts";

/**
 * `GET /api/v3/labels/{labelId}/stories` — every Story tagged with a Label.
 * Answers a bare, unbounded array.
 */
interface Input {
  labelId: number;
  includesDescription?: boolean;
}

const labelStoriesList: ActionDefinition<Input> = {
  key: "label-stories-list",
  type: "search",
  resource: "label",
  title: "List Label's Stories",
  description: "List every Story tagged with a Label.",
  params: [labelIdParam, includesDescriptionParam],
  output: [{ key: "data", type: "array", label: "Stories" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(
      `/labels/${input.labelId}/stories`,
      compact({ includes_description: input.includesDescription }),
    );
  },
};

export default labelStoriesList;
