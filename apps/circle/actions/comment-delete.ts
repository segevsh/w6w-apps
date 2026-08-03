import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { acknowledgementOutput } from "../lib/params.ts";

/**
 * `DELETE /comments/{id}` — remove a comment.
 *
 * The endpoint declares a `422` alongside the usual `200` and `404`, which is
 * unusual for a delete and worth surfacing: Circle can refuse the removal
 * rather than merely not finding the record. The v2 document does not say under
 * what conditions, so this action does not guess at a cause — the client
 * surfaces Circle's own `message` verbatim, which is the only trustworthy
 * explanation available.
 *
 * Deleting a comment that has replies is one plausible trigger, but that is an
 * inference, not something the vendor states, so it is not written into a hint
 * as though it were fact.
 *
 * Idempotent: "this comment is gone" is the state a retry is converging on.
 */
interface Input {
  commentId: number;
}

const commentDelete: ActionDefinition<Input> = {
  key: "comment-delete",
  type: "perform",
  resource: "comment",
  title: "Delete Comment",
  description:
    "Delete one comment. Circle may refuse with a 422 as well as 404 — its message is surfaced " +
    "verbatim.",
  idempotent: true,
  params: [
    {
      key: "commentId",
      label: "Comment ID",
      type: "number",
      required: true,
      validation: { integer: true },
    },
  ],
  output: acknowledgementOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request(
      `/comments/${encodeURIComponent(String(input.commentId))}`,
      { method: "DELETE" },
    );
  },
};

export default commentDelete;
