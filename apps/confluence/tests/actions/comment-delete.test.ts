import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-delete.ts";

const display = { site: "acme" };

Deno.test("comment-delete: DELETEs and reports what went, since Confluence answers 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }], { display });
  const result = await action.execute!({ commentId: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/footer-comments/c1");
  assertEquals(result, { id: "c1", deleted: true });
});

Deno.test("comment-delete: a blank id fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`commentId`");
  assertEquals(calls.length, 0);
});
