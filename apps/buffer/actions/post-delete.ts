import type { ActionDefinition } from "@w6w/types";
import { BufferClient } from "../lib/client.ts";
import { MUTATION_ERROR_TAIL } from "../lib/params.ts";

/**
 * `mutation deletePost(input: DeletePostInput!)` — remove a post.
 *
 * `DeletePostInput` has one field, `id`. The success arm is
 * `DeletePostSuccess { id }` — Buffer echoes the id it deleted and nothing
 * else, which is why the output here is a single field rather than a post
 * object.
 *
 * ## The union is only two members wide, and that matters
 *
 * `DeletePostPayload` is `DeletePostSuccess | VoidMutationError`. Buffer
 * explains what the second one is for: *"The API never explicitly returns this
 * type, but it ensures that if new error types are added later, your
 * `... on MutationError` catch-all will still receive the message — no code
 * changes needed."* So today the only way this mutation reports a failure in
 * `data` is through an arm that does not yet exist. The catch-all is still
 * selected, because the whole point of `VoidMutationError` is that the day it
 * stops being true should not be a code change.
 *
 * Failures that *do* happen today — a post id that does not resolve, a
 * credential without permission — arrive in the top-level `errors` array as
 * `NOT_FOUND` / `FORBIDDEN`, which `parseGraphQLBody` throws on.
 *
 * ## Idempotency
 *
 * Marked **not** idempotent, and this is a judgement worth stating rather than
 * defaulting. Deleting is naturally repeatable in the sense that the end state
 * is stable — but Buffer's second call does not return `DeletePostSuccess`, it
 * fails with `NOT_FOUND` in the `errors` array. A host that retried on a
 * transient network error after the delete had actually landed would surface
 * that as a failed step. `idempotent: false` makes the retry policy decline to
 * do that, which is the correct behaviour for a destructive call whose repeat
 * is indistinguishable from a genuine bad id.
 */
const DELETE_POST = `mutation W6wDeletePost($input: DeletePostInput!) {
  deletePost(input: $input) {
${MUTATION_ERROR_TAIL}
    ... on DeletePostSuccess { id }
  }
}`;

interface Input {
  postId: string;
}

const postDelete: ActionDefinition<Input> = {
  key: "post-delete",
  type: "perform",
  resource: "post",
  title: "Delete Post",
  description:
    "Delete a post by id. Buffer echoes the deleted id; deleting the same id twice fails with " +
    "NOT_FOUND rather than succeeding.",
  idempotent: false,
  params: [{ key: "postId", label: "Post ID", type: "string", required: true }],
  output: [{ key: "id", type: "string", label: "Deleted post ID" }],

  execute(input, ctx) {
    return new BufferClient(ctx).mutate(
      DELETE_POST,
      { input: { id: input.postId } },
      "deletePost",
      ["DeletePostSuccess"],
    );
  },
};

export default postDelete;
