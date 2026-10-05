import type { ActionDefinition } from "@w6w/types";
import { encodeId, FellowClient } from "../lib/client.ts";
import { ON_BEHALF_OF } from "../lib/params.ts";

interface Input {
  noteId: string;
  find: string;
  contentFellowMarkdown: string;
  onBehalfOf?: string;
}

const noteAgendaFindReplace: ActionDefinition<Input> = {
  key: "note-agenda-find-replace",
  type: "perform",
  resource: "note",
  title: "Find And Replace In Note Agenda",
  description:
    "Replace the single occurrence of a string in a note's agenda with Fellow Markdown. The text must match exactly once.",
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
      key: "find",
      label: "Text to find",
      type: "string",
      required: true,
      hint:
        "Must match exactly once. No match or more than one match is a 422 and changes nothing.",
    },
    {
      key: "contentFellowMarkdown",
      label: "Replacement (Fellow Markdown)",
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
    return new FellowClient(ctx).unwrap(
      "agenda",
      `/note/${encodeId(input.noteId)}/agenda/find-replace`,
      {
        method: "POST",
        body: { find: input.find, content_fellow_markdown: input.contentFellowMarkdown },
        onBehalfOf: input.onBehalfOf,
      },
    );
  },
};

export default noteAgendaFindReplace;
