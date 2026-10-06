import type { ActionDefinition } from "@w6w/types";
import { SliteClient } from "../lib/client.ts";
import { attributeList, listPosition, noteOutput } from "../lib/params.ts";

/**
 * `POST /v1/notes` (operationId `createNote`).
 *
 * Only `title` is required. Content is ONE of `markdown`, `html` or `sliteml` ("Either provide
 * Markdown … Or you can provide HTML … Or provide sliteml"), or a `templateId`, or nothing for
 * an empty note. Without `parentNoteId` the note lands in the key owner's personal channel.
 * `attributes` fill the parent collection's columns in column order. The 200 body is the
 * created note without its content.
 */
interface Input {
  title: string;
  parentNoteId?: string;
  templateId?: string;
  markdown?: string;
  html?: string;
  sliteml?: string;
  attributes?: string[] | string;
  listPosition?: string;
}

const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Create a note from Markdown, HTML or SliteML content, from a template, or empty.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "parentNoteId",
      label: "Parent note ID",
      type: "string",
      hint: "Create the note below this note. Left empty, it is created in your personal channel.",
    },
    {
      key: "templateId",
      label: "Template ID",
      type: "string",
      hint: "Apply this template to the new note.",
    },
    {
      key: "markdown",
      label: "Markdown content",
      type: "text",
      hint: "Use one of Markdown, HTML or SliteML, not several.",
    },
    { key: "html", label: "HTML content", type: "text" },
    {
      key: "sliteml",
      label: "SliteML content",
      type: "text",
      hint: "Slite's rich-text format, the only one that keeps every block type. Accepts the " +
        "compact form and the full-tag XML from a note read with format=sliteml.",
    },
    {
      key: "attributes",
      label: "Collection attributes",
      type: "string",
      hint: "Comma-separated values for the parent collection's columns, in column order. Values " +
        "that do not match a column's type are ignored by Slite.",
    },
    {
      key: "listPosition",
      label: "List position",
      type: "string",
      hint: "`top`, `bottom`, or a positive number (higher comes first) among the siblings. " +
        "Omitted, new notes go to the top unless a sibling was moved above.",
    },
  ],
  output: noteOutput,

  execute(input, ctx) {
    const title = (input.title ?? "").trim();
    if (!title) throw new Error("title is required");
    return new SliteClient(ctx).request("/notes", {
      method: "POST",
      body: {
        title,
        parentNoteId: input.parentNoteId || undefined,
        templateId: input.templateId || undefined,
        markdown: input.markdown || undefined,
        html: input.html || undefined,
        sliteml: input.sliteml || undefined,
        attributes: attributeList(input.attributes),
        listPosition: listPosition(input.listPosition),
      },
    });
  },
};

export default noteCreate;
