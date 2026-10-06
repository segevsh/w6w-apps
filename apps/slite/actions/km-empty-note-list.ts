import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import {
  cursorPageOutput,
  cursorParam,
  kmChannelParam,
  kmFirstParam,
  type KmInput,
  kmOwnerParam,
  kmQuery,
} from "../lib/params.ts";

/**
 * `GET /v1/knowledge-management/notes/empty` (operationId `listEmptyNotesForKnowledgeManagement`) — List empty notes for knowledge management, filtered by owner and channel.
 *
 * Cursor-paginated, 1-50 notes per page (`first`, default 20). The filters are array query
 * parameters, sent as repeated keys (`ownerIdList=a&ownerIdList=b`), OpenAPI's default style.
 */
const kmEmptyNoteList: ActionDefinition<KmInput> = {
  key: "km-empty-note-list",
  type: "search",
  resource: "note",
  title: "List Empty Notes",
  description: "List empty notes for knowledge management, filtered by owner and channel.",
  params: [
    kmOwnerParam,
    kmChannelParam,
    kmFirstParam,
    cursorParam,
  ],
  output: cursorPageOutput("notes", "Notes"),

  execute(input, ctx) {
    return new SliteClient(ctx).get("/knowledge-management/notes/empty", kmQuery(input, false));
  },
};

export default kmEmptyNoteList;
