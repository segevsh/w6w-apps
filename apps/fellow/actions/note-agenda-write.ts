import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  noteId: string;
  contentFellowMarkdown?: string;
  title?: string;
  onBehalfOf?: string;
}

const noteAgendaWrite: ActionDefinition<Input> = {
  key: "note-agenda-write",
  type: "perform",
  resource: "note",
  title: "Replace Note Agenda",
  description:
    "Replace a note's whole agenda with Fellow Markdown, and/or rename the note. Give content, a title, or both.",
  idempotent: true,
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
      label: "Agenda (Fellow Markdown)",
      type: "text",
      hint:
        "REPLACES the entire agenda. Fellow Markdown, not plain markdown: write back what Get Note returns in `content_fellow_markdown`, not `content_markdown`.",
    },
    {
      key: "title",
      label: "New title",
      type: "string",
      hint: "Renames the note, as renaming it in Fellow does.",
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
    if (!input.contentFellowMarkdown && !input.title) {
      throw new Error("Provide contentFellowMarkdown, title, or both");
    }
    return new FellowClient(ctx).unwrap("agenda", `/note/${encodeId(input.noteId)}/agenda`, {
      method: "POST",
      body: compact({ content_fellow_markdown: input.contentFellowMarkdown, title: input.title }),
      onBehalfOf: input.onBehalfOf,
    });
  },
};

export default noteAgendaWrite;
