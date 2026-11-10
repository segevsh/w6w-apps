import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-campaign.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-or-updated-campaign: seeds, emits new rows, retries idempotently, and requests the literal feed", async () => {
  const seed = ctx({ data: [{ uuid: "a", updatedAt: "t1" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.raisely.com/v3/campaigns?limit=100&offset=0&sort=updatedAt&order=desc",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ uuid: "b", updatedAt: "t3" }, { uuid: "a", updatedAt: "t1" }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ uuid: "b", updatedAt: "t3" }, { uuid: "a", updatedAt: "t1" }] }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(first.events, [{ uuid: "b", updatedAt: "t3" }]);
  assertEquals(retry, first);
  const edited = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ uuid: "a", updatedAt: "t2" }] }).ctx,
  );
  assertEquals(edited.events.length, 1);
});
