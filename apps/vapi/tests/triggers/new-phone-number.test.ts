import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-phone-number.ts";

test("new-phone-number seeds, emits records, retries idempotently, and requests descending creation", async () => {
  const body = (ids: string[]) => ({ results: ids.map((id) => ({ id })), metadata: {} });
  const seed = mockCtx([{ body: body(["1"]) }]);
  const baseline = await trigger.poll!({ params: {}, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.vapi.ai/v2/phone-number?page=1&sortBy=createdAt&sortOrder=DESC&limit=100",
  );
  const a = mockCtx([{ body: body(["2", "1"]) }]);
  const b = mockCtx([{ body: body(["2", "1"]) }]);
  const one = await trigger.poll!({ params: {}, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params: {}, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ id: "2" }]);
  assertEquals(one, retry);
});
