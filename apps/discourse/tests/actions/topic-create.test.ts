import { assert, assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/topic-create.ts";

Deno.test("topic-create: POSTs /posts.json with a title and no topic_id", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { id: 9, topic_id: 4 } }]);
  const out = await action.execute({ title: "Hello", raw: "World" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/posts.json`);
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { title: "Hello", raw: "World" });
  // Presence of `title` and ABSENCE of `topic_id` is what makes this a topic
  // rather than a reply on the same endpoint.
  assertEquals("topic_id" in body, false);
  assertEquals(out, { id: 9, topic_id: 4 });
});

Deno.test("topic-create: sends the category as `category`, not `category_id`", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ title: "t", raw: "r", category: 12 }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.category, 12);
  assertEquals("category_id" in body, false);
});

Deno.test("topic-create: auto_track goes on the wire as a real boolean, including false", async () => {
  // `auto_track` is typed boolean on this endpoint — unlike `enabled` on
  // topic-set-status, which is a string enum.
  const off = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ title: "t", raw: "r", autoTrack: false }, off.ctx);
  assertEquals(JSON.parse(off.calls[0].body!).auto_track, false);

  const on = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ title: "t", raw: "r", autoTrack: true }, on.ctx);
  assertEquals(JSON.parse(on.calls[0].body!).auto_track, true);
});

Deno.test("topic-create: carries the external-blog fields under their API names", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute(
    { title: "t", raw: "r", embedUrl: "https://blog.test/p/1", externalId: "abc" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.embed_url, "https://blog.test/p/1");
  assertEquals(body.external_id, "abc");
});

Deno.test("topic-create: is not idempotent, and says so", () => {
  assertEquals(action.idempotent, false);
  assert(action.params!.some((p) => p.key === "title" && p.required));
  assert(action.params!.some((p) => p.key === "raw" && p.required));
});
