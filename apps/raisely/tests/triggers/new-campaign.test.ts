import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-campaign.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const ctx = (body: unknown) => mockCtx([{ body }]);

test("new-campaign: seeds, emits new rows, retries idempotently, and requests the ordered feed", async () => {
  const seed = ctx({ data: [{ uuid: "a" }] });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.raisely.com/v3/campaigns?limit=100&offset=0&sort=createdAt&order=desc",
  );

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ uuid: "b" }, { uuid: "a" }] }).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx({ data: [{ uuid: "b" }, { uuid: "a" }] }).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
