import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient, type GranolaTranscriptItem } from "../lib/client.ts";
import { cursorParam, noteIdParam, pageSizeParam } from "../lib/params.ts";

/**
 * `GET /v1/notes/{note_id}/transcript` — one page of transcript items. The way
 * to read a meeting whose transcript Get Note refuses inline (413).
 */
interface Input {
  noteId: string;
  cursor?: string;
  pageSize?: number;
}

const transcriptGet: ActionDefinition<Input> = {
  key: "transcript-get",
  type: "read",
  resource: "note",
  title: "Get Transcript",
  description: "Read a note's transcript one page at a time.",
  params: [noteIdParam, cursorParam, pageSizeParam(100, "transcript items", 50)],
  output: [
    { key: "transcript", type: "array", label: "Transcript items (speaker, text, start/end time)" },
    { key: "hasMore", type: "boolean", label: "Whether another page exists" },
    { key: "cursor", type: "string", label: "Cursor for the next page" },
  ],

  execute(input, ctx) {
    return new GranolaClient(ctx).request<
      { transcript: GranolaTranscriptItem[]; hasMore: boolean; cursor: string | null }
    >(`/notes/${encodeId(input.noteId)}/transcript`, {
      query: { cursor: input.cursor, page_size: input.pageSize },
    });
  },
};

export default transcriptGet;
