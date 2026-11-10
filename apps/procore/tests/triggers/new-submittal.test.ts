import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-submittal.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-submittal: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{ body: [{ id: 1 }] }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.procore.com/rest/v1.0/projects/1/submittals?sort=created_at&page=1&per_page=100",
  );
  const page = [{ id: 2 }, { id: 1 }];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});
