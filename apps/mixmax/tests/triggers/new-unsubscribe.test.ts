import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-unsubscribe.ts";
import { mockCtx } from "../_helpers.ts";

test("new-unsubscribe seeds, emits, retries, and requests the newest page", async () => {
  const seed = mockCtx([{ body: { results: [{ _id: "old" }] } }]);
  const seeded = await trigger.poll!({ state: {}, params: {} } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://api.mixmax.com/v1/unsubscribes?sort=createdAt&sortAscending=false&limit=100",
  );
  const responses = [{ body: { results: [{ _id: "new" }, { _id: "old" }] } }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params: {} } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [{ _id: "new" }]);
  assertEquals(retry, first);
});
