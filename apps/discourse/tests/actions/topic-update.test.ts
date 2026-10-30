import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockDiscourseCtx, SITE_URL } from "../_helpers.ts";
import action from "../../actions/topic-update.ts";

test("topic-update: PUTs the literal /t/-/{id}.json route", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: { basic_topic: { id: 42 } } }]);
  await action.execute({ topicId: 42, title: "New" }, ctx);
  // The `-` is literal: Discourse's topic routes carry a slug, and `-` is the
  // documented stand-in for "I don't know it".
  assertEquals(calls[0].url, `${SITE_URL}/t/-/42.json`);
  assertEquals(calls[0].method, "PUT");
});

test("topic-update: nests the body under `topic`", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: 1, title: "New", categoryId: 7 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { topic: { title: "New", category_id: 7 } });
});

test("topic-update: omits fields the caller left alone", async () => {
  const { ctx, calls } = mockDiscourseCtx([{ body: {} }]);
  await action.execute({ topicId: 1, categoryId: 7 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { topic: { category_id: 7 } });
});

test("topic-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
