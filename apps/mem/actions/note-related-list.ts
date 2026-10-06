import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, pickQuery, plainList } from "../lib/client.ts";
import { int, noteId } from "../lib/params.ts";

/** `GET /v2/notes/{note_id}/related-notes` (Mem API v2). */
type Input = Record<string, unknown>;

const noteRelatedList: ActionDefinition<Input> = {
  key: "note-related-list",
  type: "read",
  resource: "note",
  title: "List Related Notes",
  description:
    "Find notes related to a given note, with a similarity score and the collections each belongs to.",
  params: [
    noteId,
    int("limit", "Limit", { hint: "1 to 20." }),
  ],
  output: [
    { key: "items", type: "array", label: "Related notes" },
    { key: "total", type: "number", label: "Number returned" },
  ],

  execute(input, ctx) {
    return call(ctx, "GET", `/v2/notes/${encodeId(input.note_id)}/related-notes`, {
      query: pickQuery(input, ["limit"]),
    }).then(plainList);
  },
};

export default noteRelatedList;
