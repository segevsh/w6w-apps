import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";

/**
 * `GET /v1.0/notes/{noteId}` — one note, including its text.
 *
 * The note must belong to a lead the caller can see. This is the endpoint that
 * takes the `noteId` a List Notes row carries, not that row's timeline `id`.
 *
 * The documented response is the note under a `note` key; the wrapper is read
 * defensively so a top-level note object would come back unchanged.
 */
interface Input {
  noteId: number;
}

const action: ActionDefinition<Input> = {
  key: "note-get",
  type: "read",
  resource: "note",
  title: "Get Note",
  description: "Fetch one note by id, with its text (GET /v1.0/notes/{noteId}).",
  params: [
    {
      key: "noteId",
      label: "Note ID",
      type: "number",
      required: true,
      hint: "The `noteId` from a List Notes row — not that row's timeline `id`.",
    },
  ],
  output: [
    { key: "noteId", type: "number", label: "Note ID" },
    { key: "leadId", type: "number", label: "Lead ID" },
    { key: "content", type: "string", label: "Note text" },
    { key: "isPin", type: "boolean", label: "Pinned" },
    { key: "creatorName", type: "string", label: "Created by" },
  ],

  async execute(input, ctx) {
    const body = await new LoftyClient(ctx).request<Record<string, unknown>>(
      `/notes/${input.noteId}`,
    );
    const inner = body?.note;
    return inner && typeof inner === "object" ? inner as Record<string, unknown> : body;
  },
};

export default action;
