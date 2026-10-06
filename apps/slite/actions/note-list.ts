import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { cursorPageOutput, cursorParam } from "../lib/params.ts";

/** `GET /v1/notes` (operationId `listNotes`) — cursor-paginated, optionally by owner or parent. */
interface Input {
  ownerId?: string;
  parentNoteId?: string;
  orderBy?: string;
  cursor?: string;
}

const noteList: ActionDefinition<Input> = {
  key: "note-list",
  type: "search",
  resource: "note",
  title: "List Notes",
  description: "List notes, optionally filtered by owner or parent note.",
  params: [
    {
      key: "ownerId",
      label: "Owner user ID",
      type: "string",
      hint: "Only notes owned by this user.",
    },
    {
      key: "parentNoteId",
      label: "Parent note ID",
      type: "string",
      hint: "Only notes under this parent note.",
    },
    {
      key: "orderBy",
      label: "Order by",
      type: "select",
      options: [
        { value: "lastEditedAt_DESC", label: "Last edited, newest first" },
        { value: "lastEditedAt_ASC", label: "Last edited, oldest first" },
        { value: "listPosition_DESC", label: "Sidebar position, descending" },
        { value: "listPosition_ASC", label: "Sidebar position, ascending" },
      ],
    },
    cursorParam,
  ],
  output: cursorPageOutput("notes", "Notes"),

  execute(input, ctx) {
    return new SliteClient(ctx).get("/notes", {
      ownerId: input.ownerId,
      parentNoteId: input.parentNoteId,
      orderBy: input.orderBy,
      cursor: input.cursor,
    });
  },
};

export default noteList;
