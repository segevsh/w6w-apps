import { assertEquals } from "@std/assert";
import postDelete from "../../actions/post-delete.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("post-delete: DELETE /v2/scheduler/posts/{id}; data false is not success", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(true) }, { body: envelope(false) }]);
  assertEquals(await postDelete.execute({ blogId: "9", id: "5" }, ctx), { success: true });
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/api/v2/scheduler/posts/5");
  assertEquals(await postDelete.execute({ blogId: "9", id: "6" }, ctx), { success: false });
});
