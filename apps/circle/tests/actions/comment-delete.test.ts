import { assert, assertEquals, assertRejects } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-delete.ts";

Deno.test("comment-delete: DELETEs /comments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ commentId: 3 }, ctx);
  assertEquals(calls[0].url, `${API}/comments/3`);
  assertEquals(calls[0].method, "DELETE");
});

Deno.test("comment-delete: a 422 refusal surfaces Circle's own message", async () => {
  // This route declares a 422 alongside 404, which is unusual for a delete and
  // undocumented as to cause — so the vendor's message is the only honest
  // explanation available.
  const { ctx } = mockCtx([
    { status: 422, body: { success: false, message: "Comment has replies" } },
  ]);
  const err = await assertRejects(
    () => Promise.resolve(action.execute({ commentId: 3 }, ctx)),
    Error,
  );
  assert(err.message.includes("Comment has replies"));
});
