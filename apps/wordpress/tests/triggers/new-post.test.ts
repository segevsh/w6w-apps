import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-post.ts";

test("new-post seeds, emits posts, retries idempotently, and requests newest first", async () => {
  const display = { display: { siteUrl: "https://example.com" } };
  const seed = mockCtx([{ body: [{ id: 1 }] }], display);
  const baseline = await trigger.poll!({ params: {}, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://example.com/wp-json/wp/v2/posts?orderby=date&order=desc&status=publish&per_page=100&page=1",
  );
  const a = mockCtx([{ body: [{ id: 2 }, { id: 1 }] }], display);
  const b = mockCtx([{ body: [{ id: 2 }, { id: 1 }] }], display);
  const one = await trigger.poll!({ params: {}, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params: {}, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ id: 2 }]);
  assertEquals(one, retry);
});
