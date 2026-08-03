import { assert, assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import action from "../../actions/post-delete.ts";

Deno.test("post-delete: DELETEs /posts/{id} with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true } }]);
  await action.execute({ postId: 6 }, ctx);
  assertEquals(calls[0].url, `${API}/posts/6`);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("post-delete: says plainly that there is no restore", () => {
  assert(/no restore/i.test(action.description!));
  assertEquals(action.idempotent, true);
});
