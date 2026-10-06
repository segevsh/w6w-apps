import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { noteIdParam, noteOutput, seg } from "../lib/params.ts";

/**
 * `GET /v1/notes/{noteId}` (operationId `getNoteById`) — a note plus its `content`.
 *
 * `format` is `md` (default), `html` or `sliteml`. `css` only matters for `html` (`inline`
 * embeds Slite's stylesheet, `none` omits it for a much smaller payload); `compact` only
 * matters for `sliteml`. Both are ignored by Slite for other formats, and are sent as given.
 */
interface Input {
  noteId: string;
  format?: string;
  css?: string;
  compact?: boolean;
}

const noteGet: ActionDefinition<Input> = {
  key: "note-get",
  type: "read",
  resource: "note",
  title: "Get Note",
  description: "Return a note with its content as Markdown, HTML or SliteML.",
  params: [
    noteIdParam,
    {
      key: "format",
      label: "Content format",
      type: "select",
      default: "md",
      options: [
        { value: "md", label: "Markdown" },
        { value: "html", label: "HTML" },
        { value: "sliteml", label: "SliteML" },
      ],
    },
    {
      key: "css",
      label: "HTML stylesheet",
      type: "select",
      options: [
        { value: "inline", label: "Inline Slite stylesheet (default)" },
        { value: "none", label: "None — smaller payload" },
      ],
      hint: "HTML format only.",
    },
    {
      key: "compact",
      label: "Compact SliteML",
      type: "boolean",
      hint: "SliteML format only: standard Markdown for common blocks, XML only for rich ones.",
    },
  ],
  output: [...noteOutput, { key: "content", type: "string", label: "Note content" }],

  execute(input, ctx) {
    return new SliteClient(ctx).get(`/notes/${seg(input.noteId, "noteId")}`, {
      format: input.format,
      css: input.css,
      compact: input.compact,
    });
  },
};

export default noteGet;
