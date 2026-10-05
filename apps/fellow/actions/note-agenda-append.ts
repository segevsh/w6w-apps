import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  noteId: string;
  contentFellowMarkdown: string;
  onBehalfOf?: string;
}

const noteAgendaAppend: ActionDefinition<Input> = {
  key: "note-agenda-append",
  type: "perform",
  resource: "note",
  title: "Append To Note Agenda",
  description: "Add Fellow Markdown to the end of a note's agenda, leaving the rest in place.",
  idempotent: false,
  params: [
    {
      key: "noteId",
      label: "Note ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Notes result, or an action item's `note_id`.",
    },
    {
      key: "contentFellowMarkdown",
      label: "Content (Fellow Markdown)",
      type: "text",
      required: true,
      hint:
        "Fellow Markdown, not plain markdown: write back what Get Note returns in `content_fellow_markdown`, not `content_markdown`.",
    },
    ON_BEHALF_OF,
  ],
  output: [
    { key: "note_id", type: "string", label: "Note id" },
    { key: "title", type: "string", label: "Note title" },
    {
      key: "content_fellow_markdown",
      type: "string",
      label: "The agenda as Fellow Markdown after the change",
    },
  ],

  execute(input, ctx) {
    return new FellowClient(ctx).unwrap("agenda", `/note/${encodeId(input.noteId)}/agenda/append`, {
      method: "POST",
      body: { content_fellow_markdown: input.contentFellowMarkdown },
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default noteAgendaAppend;
