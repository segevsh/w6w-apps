import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-result.ts";
const item = (id: string) => ({ id });
test("new-result seeds, emits, retries, and requests literal result ordering", async () => {
  const seed = mockCtx([{ body: page([item("a")]) }]);
  const params = { scorecard: "scorecard-1" };
  const seeded = await trigger.poll!({ params, state: {}, subscriptionId: "s" }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://open-api.scoreapp.com/scorecards/scorecard-1/results?limit=100&order_by=created_at&order_dir=desc",
  );
  const first = await trigger.poll!(
    { params, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: page([item("b"), item("a")]) }]).ctx,
  );
  const retry = await trigger.poll!(
    { params, state: seeded.nextState, subscriptionId: "s" },
    mockCtx([{ body: page([item("b"), item("a")]) }]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
