import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-draft.ts";

test("new-draft seeds, emits new drafts, retries idempotently, and requests newest first", async () => {
  const seed = mockCtx([{ body: { results: [{ id: 1 }] } }]);
  const baseline = await trigger.poll!({ params: { socialSetId: 4 }, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.typefully.com/v2/social-sets/4/drafts?order_by=-created_at&limit=50&offset=0",
  );
  const a = mockCtx([{ body: { results: [{ id: 2 }, { id: 1 }] } }]);
  const b = mockCtx([{ body: { results: [{ id: 2 }, { id: 1 }] } }]);
  const one = await trigger.poll!({ params: { socialSetId: 4 }, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!(
    { params: { socialSetId: 4 }, state: baseline.nextState },
    b.ctx,
  );
  assertEquals(one.events, [{ id: 2 }]);
  assertEquals(one, retry);
});
