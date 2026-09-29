import { assertEquals, assertRejects } from "@std/assert";
import postDelete from "../../actions/post-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-delete: a draft post is permanently deleted (204)", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const out = await postDelete.execute({ publicationId: "pub_1", postId: "post_1" }, ctx);
  assertEquals(calls[0].url, "https://api.beehiiv.com/v2/publications/pub_1/posts/post_1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { processing: false, deleted: true });
});

Deno.test("post-delete: a confirmed post archives asynchronously (202)", async () => {
  const { ctx } = mockCtx([{ status: 202, body: { data: { id: "post_1", state: "pending" } } }]);
  const out = await postDelete.execute({ publicationId: "pub_1", postId: "post_1" }, ctx);
  assertEquals(out, { processing: true, deleted: false });
});

Deno.test("post-delete: any other status throws", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { errors: [{ code: "NOT_FOUND" }] } }]);
  await assertRejects(() =>
    Promise.resolve(postDelete.execute({ publicationId: "pub_1", postId: "post_1" }, ctx))
  );
});

Deno.test("post-delete: is an idempotent perform action", () => {
  assertEquals(postDelete.type, "perform");
  assertEquals(postDelete.idempotent, true);
});
