import type { ActionDefinition } from "@w6w/types";
import { encodeId, PracticeBetterClient } from "../lib/client.ts";

/**
 * `DELETE /tags/{tagId}` — delete a tag.
 *
 * Security: `[read, write]`. The document declares no response schema, so the
 * action reports the status it got rather than a parsed body.
 *
 * Idempotent in the sense the runtime cares about — a retry cannot delete a
 * second tag — though the second call may answer `404`, which is surfaced rather
 * than swallowed so "wrong id" is not mistaken for "already gone".
 */
interface Input {
  tagId: string;
}

const deleteTag: ActionDefinition<Input, { status: number }> = {
  key: "delete-tag",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description: "Delete a tag. Returns the HTTP status; the endpoint has no response body.",
  idempotent: true,
  params: [
    {
      key: "tagId",
      label: "Tag ID",
      type: "string",
      required: true,
      hint: "The tag's `id`. Use `list-tags` to find it.",
    },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new PracticeBetterClient(ctx).status(`/tags/${encodeId(input.tagId)}`, {
      method: "DELETE",
    });
    return { status };
  },
};

export default deleteTag;
