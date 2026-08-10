import { assert, assertEquals, assertRejects } from "@std/assert";
import { data, gqlError, gqlOf, mockCtx } from "../_helpers.ts";
import postDelete from "../../actions/post-delete.ts";

Deno.test("post-delete: DeletePostInput takes only an id", async () => {
  const { ctx, calls } = mockCtx([
    data({ deletePost: { __typename: "DeletePostSuccess", id: "p1" } }),
  ]);
  const out = await postDelete.execute({ postId: "p1" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { id: "p1" } });
  assertEquals((out as { id: string }).id, "p1");
});

Deno.test("post-delete: the catch-all is still selected, for VoidMutationError's sake", async () => {
  const { ctx, calls } = mockCtx([
    data({ deletePost: { __typename: "DeletePostSuccess", id: "p1" } }),
  ]);
  await postDelete.execute({ postId: "p1" }, ctx);
  // Buffer never returns VoidMutationError today — it exists so a new arm
  // added later still arrives with a message. That day should not be a code
  // change.
  assert(/\.\.\. on MutationError \{ message \}/.test(gqlOf(calls[0]).query));
});

Deno.test("post-delete: a future error arm would throw rather than pass as a result", async () => {
  const { ctx } = mockCtx([
    data({ deletePost: { __typename: "VoidMutationError", message: "cannot delete a sent post" } }),
  ]);
  const err = await assertRejects(
    () => Promise.resolve(postDelete.execute({ postId: "p1" }, ctx)),
    Error,
  );
  assert(/cannot delete a sent post/.test(err.message), err.message);
});

Deno.test("post-delete: a bad id arrives in the top-level errors array today", async () => {
  const { ctx } = mockCtx([gqlError("Resource not found", "NOT_FOUND")]);
  const err = await assertRejects(
    () => Promise.resolve(postDelete.execute({ postId: "nope" }, ctx)),
    Error,
  );
  assert(/NOT_FOUND/.test(err.message), err.message);
});

Deno.test("post-delete: not idempotent — the second call fails rather than succeeding", () => {
  // Buffer answers NOT_FOUND on a repeat, so a retry after a landed delete
  // would surface as a failed step. `false` makes the retry policy decline.
  assertEquals(postDelete.idempotent, false);
  assert(/twice fails/.test(postDelete.description!), postDelete.description);
});
