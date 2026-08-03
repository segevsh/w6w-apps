import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/post-update.ts";

Deno.test("post-update: PUTs /posts/{id}.json with the body nested under `post`", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { post: { id: 5, raw: "new" } } }]);
  const out = await action.execute({ postId: 5, raw: "new" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/posts/5.json`);
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { post: { raw: "new" } });
  // The envelope is unwrapped so downstream steps see the post itself.
  assertEquals(out, { id: 5, raw: "new" });
});

Deno.test("post-update: an edit reason rides inside the `post` object", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ postId: 1, raw: "x", editReason: "typo" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { post: { raw: "x", edit_reason: "typo" } });
});

Deno.test("post-update: bypass_bump sits OUTSIDE the post object, where the schema puts it", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ postId: 1, raw: "x", bypassBump: true }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.bypass_bump, true);
  assertEquals("bypass_bump" in body.post, false);
});

Deno.test("post-update: an unenveloped response passes through unchanged", async () => {
  const { ctx } = mockDiscourseCtx([{ body: { id: 5 } }]);
  assertEquals(await action.execute({ postId: 5, raw: "x" }, ctx), { id: 5 });
});
