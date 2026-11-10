import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-user.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const conn = { display: { schoolDomain: "https://yourschool.learnworlds.com" } };
const response = (data: unknown[]) => ({ body: { data, meta: {} } });

test("new-user seeds, emits, retries, and requests the literal newest-first page", async () => {
  const old = { id: "u1" };
  const fresh = { id: "u2" };
  const seed = mockCtx([response([old])], conn);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://yourschool.learnworlds.com/admin/api/v2/users?page=1&items_per_page=200",
  );
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response([fresh, old])], conn).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([response([fresh, old])], conn).ctx,
  );
  assertEquals(first.events, [fresh]);
  assertEquals(retry, first);
});
