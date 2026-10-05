import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  noteId: string;
  onBehalfOf?: string;
}

const noteGet: ActionDefinition<Input> = {
  key: "note-get",
  type: "read",
  resource: "note",
  title: "Get Note",
  description: "Retrieve one note: meeting details, attendees and recording ids.",
  params: [
    {
      key: "noteId",
      label: "Note ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Notes result, or an action item's `note_id`.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "id", type: "string", label: "Note id" },
    { key: "title", type: "string", label: "Title" },
    { key: "event_start", type: "string", label: "Meeting start" },
    { key: "event_end", type: "string", label: "Meeting end" },
    { key: "recording_ids", type: "array", label: "Recordings of this meeting" },
    { key: "event_attendees", type: "array", label: "Attendees" },
    { key: "content_markdown", type: "string", label: "Read-only markdown rendering" },
    { key: "content_fellow_markdown", type: "string", label: "Editable Fellow Markdown" },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).unwrap("note", `/note/${encodeId(input.noteId)}`, {
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default noteGet;
