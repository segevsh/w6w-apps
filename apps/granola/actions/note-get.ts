import type { ActionDefinition } from "@w6w/types";
import { encodeId, GranolaClient, type GranolaNote } from "../lib/client.ts";
import { noteIdParam } from "../lib/params.ts";

/**
 * `GET /v1/notes/{note_id}` — one note with its AI summary, attendees, calendar
 * event and folders.
 *
 * `include=transcript` asks for the transcript inline, but Granola answers
 * **413 `TRANSCRIPT_TOO_LARGE`** when it does not fit. Rather than fail a
 * workflow on a long meeting, this action re-reads the note without the
 * transcript and sets `transcript_too_large: true` so the caller can branch to
 * Get Transcript, which pages it.
 *
 * `private_notes_*` are only populated when the API key belongs to the note's
 * owner; they are `null` for shared notes and workspace-scoped keys.
 */
interface Input {
  noteId: string;
  includeTranscript?: boolean;
}

const noteGet: ActionDefinition<Input> = {
  key: "note-get",
  type: "read",
  resource: "note",
  title: "Get Note",
  description: "Fetch one note with its summary, attendees and (optionally) transcript.",
  params: [
    noteIdParam,
    {
      key: "includeTranscript",
      label: "Include transcript",
      type: "boolean",
      hint: "If the transcript is too large to return inline the note is returned without it and " +
        "`transcript_too_large` is true; use Get Transcript to page it.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "web_url", type: "string", label: "Granola web URL" },
    { key: "summary_text", type: "string", label: "Summary (plain text)" },
    { key: "summary_markdown", type: "string", label: "Summary (markdown)" },
    { key: "attendees", type: "array", label: "Attendees" },
    { key: "calendar_event", type: "object", label: "Calendar event" },
    { key: "folder_membership", type: "array", label: "Folders" },
    { key: "transcript", type: "array", label: "Transcript, when requested and it fit inline" },
    { key: "transcript_too_large", type: "boolean", label: "True when 413 forced a fallback" },
  ],

  async execute(input, ctx) {
    const client = new GranolaClient(ctx);
    const path = `/notes/${encodeId(input.noteId)}`;
    const res = await client.requestRaw(path, {
      query: { include: input.includeTranscript ? "transcript" : undefined },
    });
    if (res.status === 413) {
      const note = await client.request<GranolaNote>(path);
      return { ...note, transcript_too_large: true };
    }
    if (!res.ok) await client.fail(res, "GET", path);
    const note = await res.json() as GranolaNote;
    return { ...note, transcript_too_large: false };
  },
};

export default noteGet;
