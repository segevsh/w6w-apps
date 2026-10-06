import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/comments/{id}` — Delete a comment. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const commentDelete: ActionDefinition<Input> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description: "Delete a comment.",
  idempotent: true,
  params: [idParam("id", "Comment ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/comments/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default commentDelete;
