import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comment-create.ts";

const display = { site: "acme" };

Deno.test("comment-create: comments on a page", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "c1" } }], { display });
  await action.execute!({ pageId: "1", body: "<p>looks good</p>" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/footer-comments");
  assertEquals(JSON.parse(calls[0].body!), {
    pageId: "1",
    body: { representation: "storage", value: "<p>looks good</p>" },
  });
});

Deno.test("comment-create: a parent comment makes it a reply", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ parentCommentId: "c1", body: "agreed" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).parentCommentId, "c1");
});

/**
 * The schema marks nothing required, but the target is: exactly one of the
 * five. Confluence's own error for getting this wrong names none of them.
 */
Deno.test("comment-create: exactly one target is enforced locally", async () => {
  const none = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ body: "hi" }, none.ctx),
    Error,
    "set one of",
  );
  const both = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ pageId: "1", blogPostId: "b1", body: "hi" }, both.ctx),
    Error,
    "set only one target",
  );
  assertEquals(none.calls.length + both.calls.length, 0);
});

Deno.test("comment-create: an empty comment fails before any request", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ pageId: "1", body: "  " }, ctx),
    Error,
    "`body` is required",
  );
  assertEquals(calls.length, 0);
});
