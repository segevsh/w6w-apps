import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-message.ts";

test("new-message seeds, emits messages, retries idempotently, and requests newest first", async () => {
  const body = (ids: number[]) => ({ messages: ids.map((id) => ({ id })), pages: {} });
  const seed = mockCtx([{ body: body([1]) }]);
  const baseline = await trigger.poll!({ params: {}, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://app.webinargeek.com/api/v2/messages?order=created_at&sort=desc&page=1&per_page=100",
  );
  const a = mockCtx([{ body: body([2, 1]) }]);
  const b = mockCtx([{ body: body([2, 1]) }]);
  const one = await trigger.poll!({ params: {}, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params: {}, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ id: 2 }]);
  assertEquals(one, retry);
});
