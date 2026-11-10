import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-conversation.ts";

test("new-conversation seeds, emits conversations, retries idempotently, and requests newest first", async () => {
  const body = (ids: string[]) => ({ results: ids.map((contact_id) => ({ contact_id })) });
  const seed = mockCtx([{ body: body(["1"]) }]);
  const params = { formId: "f1" };
  const baseline = await trigger.poll!({ params, state: {} }, seed.ctx);
  assertEquals(baseline.events, []);
  assertEquals(baseline.nextState.seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.videoask.com/forms/f1/conversations?limit=100&order_by=-latest_interaction",
  );
  const a = mockCtx([{ body: body(["2", "1"]) }]);
  const b = mockCtx([{ body: body(["2", "1"]) }]);
  const one = await trigger.poll!({ params, state: baseline.nextState }, a.ctx);
  const retry = await trigger.poll!({ params, state: baseline.nextState }, b.ctx);
  assertEquals(one.events, [{ contact_id: "2" }]);
  assertEquals(one, retry);
});
