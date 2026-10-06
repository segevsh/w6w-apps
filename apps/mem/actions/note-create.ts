import type { ActionDefinition } from "@w6w/types";
import { call, list, pick } from "../lib/client.ts";
import { str, text, timestampHint } from "../lib/params.ts";

/** `POST /v2/notes` (Mem API v2). */
type Input = Record<string, unknown>;

const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description:
    "Create a note from markdown. The first line of the content becomes the title. Optionally link it to collections by ID or by exact (case-insensitive) title.",
  idempotent: false,
  params: [
    text("content", "Content", {
      required: true,
      hint: "Full markdown body (up to 200,000 characters). The first line becomes the title.",
    }),
    str("collection_ids", "Collection IDs", {
      hint: "Comma-separated collection UUIDs. Unknown IDs are ignored.",
    }),
    str("collection_titles", "Collection titles", {
      hint:
        "Comma-separated collection titles, matched case-insensitively and exactly. Unmatched titles are ignored.",
    }),
    str("id", "Note ID", {
      hint: "Optional UUID to create the note under; Mem generates one when omitted.",
    }),
    str("created_at", "Created at", { hint: timestampHint + " Cannot be in the future." }),
    str("updated_at", "Updated at", { hint: timestampHint + " Cannot be in the future." }),
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "title", type: "string", label: "Title" },
    { key: "content", type: "string", label: "Stored markdown" },
    { key: "version", type: "number", label: "Content version" },
    { key: "collection_ids", type: "array", label: "Collection IDs" },
    { key: "created_at", type: "string", label: "Created" },
    { key: "updated_at", type: "string", label: "Updated" },
  ],

  execute(input, ctx) {
    const body = pick(input, [
      "content",
      "collection_ids",
      "collection_titles",
      "id",
      "created_at",
      "updated_at",
    ]);
    const collection_ids = list(input.collection_ids);
    if (collection_ids) body.collection_ids = collection_ids;
    const collection_titles = list(input.collection_titles);
    if (collection_titles) body.collection_titles = collection_titles;
    return call(ctx, "POST", `/v2/notes`, { body });
  },
};

export default noteCreate;
