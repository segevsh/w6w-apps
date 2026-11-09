import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-post.ts";

test("new-post seeds, emits a new post, retries idempotently, and uses the newest-first feed", async () => {
  const first = { id: "p1" };
  const second = { id: "p2" };
  const page = (items: unknown[]) => ({
    kind: "Listing",
    data: { children: items.map((data) => ({ kind: "t3", data })), after: null },
  });
  const seed = mockCtx([{ body: page([first]) }]);
  const seeded = await trigger.poll!(
    { params: { subreddit: "test" }, state: {} } as never,
    seed.ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const fresh = mockCtx([{ body: page([second, first]) }]);
  const result = await trigger.poll!(
    { params: { subreddit: "test" }, state: seeded.nextState } as never,
    fresh.ctx,
  );
  assertEquals(result.events, [second]);
  const retry = mockCtx([{ body: page([second, first]) }]);
  assertEquals(
    await trigger.poll!(
      { params: { subreddit: "test" }, state: seeded.nextState } as never,
      retry.ctx,
    ),
    result,
  );
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://oauth.reddit.com/r/test/new.json?limit=100",
  });
});
