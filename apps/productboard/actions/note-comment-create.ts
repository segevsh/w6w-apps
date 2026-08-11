import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { noteIdParam } from "../lib/params.ts";

/**
 * `POST /v2/notes/{id}/comments` — comment on a note.
 *
 * Write-only in v2, and deliberately so: the migration guide records that
 * `comments[]` was removed from the note response, and there is no
 * `GET .../comments` endpoint to replace it. So a workflow can add a comment but
 * cannot read the thread back through the API. Saying that here is cheaper than
 * someone discovering it while designing a two-way sync.
 *
 * `content` is 1–7,000 characters, enforced by the vendor's schema.
 *
 * **Not idempotent.** No idempotency key, so a retry posts a second identical
 * comment.
 */
interface Input {
  noteId: string;
  content: string;
}

const noteCommentCreate: ActionDefinition<Input, DataResult> = {
  key: "note-comment-create",
  type: "perform",
  resource: "note",
  title: "Comment on note",
  description:
    "Add a comment to a note. Write-only — v2 removed comments from the note response and offers " +
    "no endpoint to read them back.",
  idempotent: false,
  params: [
    noteIdParam,
    {
      key: "content",
      label: "Comment",
      type: "text",
      required: true,
      validation: { minLength: 1, maxLength: 7000 },
      hint: "1 to 7,000 characters.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Created comment" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/notes/${encodeId(input.noteId)}/comments`,
      { method: "POST", body: { data: { content: input.content } } },
    );
    return { data };
  },
};

export default noteCommentCreate;
