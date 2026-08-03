import { assertEquals } from "@std/assert";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/topic-get.ts";

Deno.test("topic-get: GETs /t/{id}.json and returns the payload whole", async () => {
  const body = { id: 42, title: "T", post_stream: { posts: [{ id: 1 }], stream: [1, 2] } };
  const { ctx, calls } = mockDiscourseCtx([{ body }]);
  const out = await action.execute({ topicId: 42 }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/t/42.json`);
  assertEquals(calls[0].method, "GET");
  // The post_stream must survive — it is the first page of posts, and the
  // reason there is no separate "get first post" action.
  assertEquals(out, body);
});

Deno.test("topic-get: encodes the id rather than concatenating it", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: "1/../admin" }, ctx);
  assertEquals(calls[0].url, `${SITE_URL}/t/1%2F..%2Fadmin.json`);
});
