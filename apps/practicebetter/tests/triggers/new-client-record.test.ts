import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page } from "../_helpers.ts";
import trigger from "../../triggers/new-client-record.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const rec = (id: string) => ({ id, isActive: true, dateCreated: "2026-11-10T09:00:00Z" });

test("new-client-record seeds, emits, retries, and requests the literal newest-first page", async () => {
  const seed = mockCtx([{ body: page([rec("r1")]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals({ method: seed.calls[0].method, url: seed.calls[0].url }, {
    method: "GET",
    url: "https://api.practicebetter.io/consultant/records?limit=100",
  });
  const items = [rec("r2"), rec("r1")];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page(items) }]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page(items) }]).ctx,
  );
  assertEquals(first.events, [rec("r2")]);
  assertEquals(retry, first);
});
