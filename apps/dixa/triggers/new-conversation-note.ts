import type { Param } from "@w6w/types";
import { idOf, snapshotTrigger } from "../lib/triggers.ts";
import noteList from "../actions/note-list.ts";
import { conversationIdParam } from "../lib/params.ts";

/**
 * Per-parent bounded collection (brief 9.1 c): `GET /v1/conversations/{conversationId}/notes`
 * returns one conversation's internal notes in a single response, with no documented order or
 * filter (https://docs.dixa.io/openapi/dixa-api/v1/ , verified 2026-11-10).
 */
export default snapshotTrigger<{ conversationId: number | string }>({
  key: "new-conversation-note",
  title: "New Conversation Note",
  description: "The run gets each internal note newly added to one Dixa conversation.",
  params: [conversationIdParam as Param],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "authorId", type: "string", label: "Author ID" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "csid", type: "number", label: "Conversation ID" },
    { key: "message", type: "string", label: "Note text" },
  ],
  sample: {
    id: "2c3d4e5f-6071-4b8c-9d0e-1f2a3b4c5d6e",
    authorId: "9e4b2a0c-5f3d-4a8e-b6c1-7d2f0a1b3c4d",
    createdAt: "2026-11-09T10:05:00Z",
    csid: 4217,
    message: "Customer called back, refund approved.",
  },
  fetchRows: async (params, ctx) => {
    const out = await noteList.execute({ conversationId: params.conversationId }, ctx) as {
      data?: unknown[];
    };
    return out.data ?? [];
  },
  idOf,
});
