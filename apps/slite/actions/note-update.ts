import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { attributeList, listPosition, noteIdParam, noteOutput, seg } from "../lib/params.ts";

/**
 * `PUT /v1/notes/{noteId}` (operationId `updateNote`) — replace a note's content and/or title.
 *
 * Every body field is optional. Content (`markdown`, `html` or `sliteml`) REPLACES the note's
 * body; it is not appended. Slite does not document how it merges a partial body, so only the
 * fields given are sent.
 */
interface Input {
  noteId: string;
  title?: string;
  markdown?: string;
  html?: string;
  sliteml?: string;
  attributes?: string[] | string;
  listPosition?: string;
}

const noteUpdate: ActionDefinition<Input> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update Note",
  description: "Replace a note's content and/or title, set collection attributes or its position.",
  idempotent: true,
  params: [
    noteIdParam,
    { key: "title", label: "New title", type: "string" },
    {
      key: "markdown",
      label: "New Markdown content",
      type: "text",
      hint: "Replaces the whole body. Use one of Markdown, HTML or SliteML.",
    },
    { key: "html", label: "New HTML content", type: "text" },
    { key: "sliteml", label: "New SliteML content", type: "text" },
    {
      key: "attributes",
      label: "Collection attributes",
      type: "string",
      hint: "Comma-separated values for the parent collection's columns, in column order.",
    },
    {
      key: "listPosition",
      label: "List position",
      type: "string",
      hint: "`top`, `bottom`, or a positive number (higher comes first).",
    },
  ],
  output: noteOutput,

  execute(input, ctx) {
    return new SliteClient(ctx).request(`/notes/${seg(input.noteId, "noteId")}`, {
      method: "PUT",
      body: {
        title: input.title || undefined,
        markdown: input.markdown || undefined,
        html: input.html || undefined,
        sliteml: input.sliteml || undefined,
        attributes: attributeList(input.attributes),
        listPosition: listPosition(input.listPosition),
      },
    });
  },
};

export default noteUpdate;
