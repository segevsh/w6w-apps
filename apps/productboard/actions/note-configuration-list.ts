import type { ActionDefinition } from "@w6w/types";
import { type ListResult, ProductboardClient, toList } from "../lib/client.ts";
import { noteTypeOptions } from "../lib/params.ts";

/**
 * `GET /v2/notes/configurations` — what fields does a note have here?
 *
 * The note-side twin of `entity-configuration-list`, and it earns its place for
 * the same reason: the fields a note carries are workspace configuration, and
 * v2's note response is *leaner* than v1's. The migration guide lists what left:
 * `followers[]`, `comments[]`, `totalResults` and `features[].importance` are no
 * longer part of a note response. The guide's own advice for the current shape
 * is to call this endpoint, so an integration that hard-codes v1's fields finds
 * out here rather than in production.
 *
 * The endpoint declares two ways to filter — `type[]` (repeated) and `type`
 * (single) — which is a genuine redundancy in the vendor's document. This action
 * uses the repeated form, since it can express everything the single one can.
 */
interface Input {
  types?: string[] | string;
}

const noteConfigurationList: ActionDefinition<Input, ListResult> = {
  key: "note-configuration-list",
  type: "read",
  resource: "note",
  title: "List note configurations",
  description:
    "Discover which fields notes have in this workspace, their types, and the patch operations " +
    "they support. v2 notes no longer carry followers, comments or importance.",
  params: [
    {
      key: "types",
      label: "Note types",
      type: "multiselect",
      options: noteTypeOptions,
      hint: "Sent as repeated `type[]` values. Leave empty for every note type.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Configurations" },
    { key: "nextPageCursor", type: "string", label: "Cursor for the next page" },
    { key: "hasMore", type: "boolean", label: "Another page is available" },
  ],

  execute(input, ctx) {
    return new ProductboardClient(ctx).list("/notes/configurations", {
      query: { "type[]": toList(input.types) },
    });
  },
};

export default noteConfigurationList;
