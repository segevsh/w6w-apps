import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-article.ts";

test("new-article seeds, emits, retries, and requests newest stream contents", async () => {
  const old = { id: "old" }, fresh = { id: "fresh" };
  const seed = mockCtx([{ body: { items: [old] } }]);
  const seeded = await trigger.poll!({ params: {}, state: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const result = await trigger.poll!(
    { params: {}, state: seeded.nextState } as never,
    mockCtx([{ body: { items: [fresh, old] } }]).ctx,
  );
  assertEquals(result.events, [fresh]);
  assertEquals(
    await trigger.poll!(
      { params: {}, state: seeded.nextState } as never,
      mockCtx([{ body: { items: [fresh, old] } }]).ctx,
    ),
    result,
  );
  assertEquals(
    new URL(seed.calls[0].url).toString(),
    "https://www.inoreader.com/reader/api/0/stream/contents/user%2F-%2Fstate%2Fcom.google%2Freading-list?n=100",
  );
});
