import type { ActionDefinition } from "@w6w/types";
import { LoftyClient } from "../lib/client.ts";
import { leadIdParam } from "../lib/params.ts";

/**
 * `PUT /v1.0/notes/{noteId}` — edit a note's text and pin state.
 *
 * The body carries all three fields the create does — `content`, `leadId` and
 * `isPin` — and the spec marks each required. So this is a whole-note write
 * rather than a patch: resend the note's own `leadId`, and set `isPin` to the
 * state the note should end in.
 *
 * Content is truncated to 2000 characters exactly as on create.
 *
 * The response body is not documented; the HTTP status is returned.
 */
interface Input {
  noteId: number;
  content: string;
  leadId: number;
  isPin: boolean;
}

const action: ActionDefinition<Input> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update Note",
  description: "Edit a note's text and pin state (PUT /v1.0/notes/{noteId}).",
  idempotent: true,
  params: [
    {
      key: "noteId",
      label: "Note ID",
      type: "number",
      required: true,
      hint: "The note to update.",
    },
    {
      key: "content",
      label: "Note",
      type: "text",
      required: true,
      hint: "Truncated to 2000 characters by Lofty, silently.",
    },
    leadIdParam,
    {
      key: "isPin",
      label: "Pin to top",
      type: "boolean",
      required: true,
      default: false,
    },
  ],
  output: [
    { key: "noteId", type: "number", label: "Updated note ID" },
    { key: "status", type: "number", label: "HTTP status" },
  ],

  async execute(input, ctx) {
    const status = await new LoftyClient(ctx).status(`/notes/${input.noteId}`, {
      method: "PUT",
      body: { content: input.content, leadId: input.leadId, isPin: input.isPin },
    });
    return { noteId: input.noteId, status };
  },
};

export default action;
