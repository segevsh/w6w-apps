import type { ActionDefinition } from "@w6w/types";
import { AttioClient, compact, optionsFrom } from "../lib/client.ts";

interface Input {
  parentObject: string;
  parentRecordId: string;
  title: string;
  content: string;
  format?: string;
  createdAt?: string;
  meetingId?: string;
}

/** The `format` enum, verbatim from the request schema. */
export const NOTE_FORMATS = ["plaintext", "markdown"] as const;

/**
 * `POST /v2/notes` — attach a note to a record.
 *
 * ## Five required fields, and `format` is one of them
 *
 * `parent_object`, `parent_record_id`, `title`, `format` and `content` are all
 * `required`. `format` having no default is unusual and deliberate — it decides
 * how `content` is parsed and there is no safe guess, so this action defaults it
 * to `plaintext` at the form (the conservative choice: markdown syntax in a
 * plaintext note renders as literal asterisks, which is ugly; plaintext in a
 * markdown note can silently mangle a line starting with `#`).
 *
 * ## The markdown subset is small, and it is enumerated
 *
 * Not CommonMark. Verbatim, the whole of it:
 *
 *   - **Headings**: levels 1–3 (`#`, `##`, `###`) — no `####`.
 *   - **Lists**: unordered (`-`, `*`, `+`) and ordered (`1.`, `2.`).
 *   - **Text styles**: bold, italic, strikethrough (`~~…~~`), and **highlight**
 *     (`==highlighted==`), which is not standard markdown at all.
 *   - **Links**: `[text](https://example.com)`.
 *
 * And one explicit exclusion: "While the Attio interface supports image embeds,
 * they cannot currently be added or retrieved via the API's markdown format."
 * There are no tables, no code blocks and no blockquotes.
 *
 * In `plaintext`, `\n` is the line break and nothing else is interpreted.
 *
 * ## `title` is never formatted
 *
 * "The note title. The title is plaintext only and has no formatting." Markdown
 * in a title stays literal regardless of `format`.
 *
 * ## Backdating is allowed, within limits
 *
 * "`created_at` will default to the current time. However, if you wish to
 * backdate a note for migration or other purposes, you can override with a
 * custom `created_at` value. Note that dates before 1970 or in the future are
 * not allowed." Both bounds are rejections, not clamps.
 */
const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "note",
  title: "Create Note",
  idempotent: false,
  description:
    "Attach a note to any record. Markdown is supported but only a named subset — headings 1–3, " +
    "lists, bold/italic/strikethrough/highlight and links. No images, tables or code blocks.",
  params: [
    {
      key: "parentObject",
      label: "Parent object",
      type: "string",
      required: true,
      placeholder: "people",
      hint: "Slug or UUID of the object the note's record belongs to.",
    },
    {
      key: "parentRecordId",
      label: "Parent record id",
      type: "string",
      required: true,
      placeholder: "891dcbfc-9141-415d-9b2a-2238a6cc012d",
    },
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      placeholder: "Initial Prospecting Call Summary",
      hint: "**Plaintext only** — the title is never formatted, whatever the Format below says.",
    },
    {
      key: "content",
      label: "Content",
      type: "text",
      required: true,
      hint: "The note body, parsed according to Format.",
    },
    {
      key: "format",
      label: "Format",
      type: "select",
      required: true,
      default: "plaintext",
      options: optionsFrom(NOTE_FORMATS),
      hint:
        "`plaintext` treats `\\n` as a line break and interprets nothing else. `markdown` enables " +
        "a **subset**: headings `#` to `###` only, `-`/`*`/`+` and `1.` lists, `**bold**`, " +
        "`*italic*`, `~~strikethrough~~`, `==highlight==` and `[links](url)`. Images, tables and " +
        "code blocks are not supported — image embeds work in the Attio UI but not through the " +
        "API.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "string",
      advanced: true,
      hint: "Backdate the note, for migrations. ISO 8601. Dates before 1970 or in the future are " +
        "**rejected**, not clamped. Defaults to now.",
    },
    {
      key: "meetingId",
      label: "Meeting id",
      type: "string",
      advanced: true,
      hint: "Associate the note with an existing meeting. The meeting must already exist.",
    },
  ],
  output: [
    { key: "id", type: "object", label: "Composite id (workspace_id, note_id)" },
    { key: "title", type: "string", label: "Note title" },
    { key: "content_plaintext", type: "string", label: "The note body as plaintext" },
    { key: "created_at", type: "string", label: "Creation timestamp" },
  ],

  execute(input, ctx) {
    return new AttioClient(ctx).data("/notes", {
      method: "POST",
      body: {
        data: compact({
          parent_object: input.parentObject,
          parent_record_id: input.parentRecordId,
          title: input.title,
          format: input.format ?? "plaintext",
          content: input.content,
          created_at: input.createdAt,
          meeting_id: input.meetingId,
        }),
      },
    });
  },
};

export default createNote;
