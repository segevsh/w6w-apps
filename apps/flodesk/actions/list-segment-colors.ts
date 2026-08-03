import type { ActionDefinition } from "@w6w/types";
import { FlodeskClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /v1/segments/colors` — the palette Create Segment's `color` accepts.
 *
 * Unlike every other list in this API it is NOT paginated and carries NO `meta`
 * envelope: the documented response schema is a bare `string[]` of hex codes.
 *
 * It is also the cheapest authenticated read in the whole surface, which is why
 * both the auth `test` hook and the `quota` health check probe it.
 */
const listSegmentColors: ActionDefinition<Input> = {
  key: "list-segment-colors",
  type: "read",
  resource: "segment",
  title: "List Segment Colors",
  description:
    "Return the hex colours Flodesk accepts for a segment, as a bare array of strings. Not paginated and carries no `meta` envelope.",
  params: [],
  output: [{ key: "colors", type: "array", label: "Hex colour codes" }],

  execute(_input, ctx) {
    return new FlodeskClient(ctx).request<string[]>("/segments/colors");
  },
};

export default listSegmentColors;
