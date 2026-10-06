import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { cursorPageOutput, cursorParam, noteIdParam, seg } from "../lib/params.ts";

/**
 * `GET /v1/notes/{noteId}/children` (operationId `getNoteChildren`).
 *
 * `cursor` is "only used if current note has more than 50 children". `includeDescendants`
 * returns the whole flattened subtree; rebuild the hierarchy from each note's `parentNoteId`.
 */
interface Input {
  noteId: string;
  orderBy?: string;
  orderDirection?: string;
  includeDescendants?: boolean;
  cursor?: string;
}

const noteChildrenList: ActionDefinition<Input> = {
  key: "note-children-list",
  type: "search",
  resource: "note",
  title: "List Note Children",
  description: "List a note's direct children, or its whole subtree flattened.",
  params: [
    noteIdParam,
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "title", label: "Title (default)" },
        { value: "listPosition", label: "Sidebar position" },
        { value: "lastEditedAt", label: "Last edited" },
      ],
    },
    {
      key: "orderDirection",
      label: "Direction",
      type: "select",
      options: [
        { value: "asc", label: "Ascending (default)" },
        { value: "desc", label: "Descending" },
      ],
      hint: "Use Sidebar position + Descending to match the sidebar order.",
    },
    {
      key: "includeDescendants",
      label: "Include all descendants",
      type: "boolean",
      hint: "Return the whole subtree, flattened, instead of only direct children.",
    },
    cursorParam,
  ],
  output: cursorPageOutput("notes", "Child notes"),

  execute(input, ctx) {
    return new SliteClient(ctx).get(`/notes/${seg(input.noteId, "noteId")}/children`, {
      orderBy: input.orderBy,
      orderDirection: input.orderDirection,
      includeDescendants: input.includeDescendants,
      cursor: input.cursor,
    });
  },
};

export default noteChildrenList;
