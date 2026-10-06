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
  kmReviewStateParam,
  kmSinceParam,
} from "../lib/params.ts";

/**
 * `GET /v1/knowledge-management/notes/public` (operationId `listPublicNotesForKnowledgeManagement`) — List public notes for knowledge management, filtered by review state, owner, channel and recency.
 *
 * Cursor-paginated, 1-50 notes per page (`first`, default 20). The filters are array query
 * parameters, sent as repeated keys (`ownerIdList=a&ownerIdList=b`), OpenAPI's default style.
 */
const kmPublicNoteList: ActionDefinition<KmInput> = {
  key: "km-public-note-list",
  type: "search",
  resource: "note",
  title: "List Public Knowledge-Management Notes",
  description:
    "List public notes for knowledge management, filtered by review state, owner, channel and recency.",
  params: [
    kmReviewStateParam,
    kmSinceParam,
    kmOwnerParam,
    kmChannelParam,
    kmFirstParam,
    cursorParam,
  ],
  output: cursorPageOutput("notes", "Notes"),

  execute(input, ctx) {
    return new SliteClient(ctx).get("/knowledge-management/notes/public", kmQuery(input, true));
  },
};

export default kmPublicNoteList;
