import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-employee.ts";

const input = { params: {}, subscriptionId: "sub-1" };
test("new-employee: seeds, emits new records, retries idempotently, and requests the feed", async () => {
  const seed = mockCtx([{ body: { data: [{ attributes: { id: { value: "employee-1" } } }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api.personio.de/v1/company/employees?limit=100&offset=0",
  );
  const page = {
    data: [{ attributes: { id: { value: "employee-2" } } }, {
      attributes: { id: { value: "employee-1" } },
    }],
  };
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
