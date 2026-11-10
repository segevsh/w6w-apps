import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-receiver.ts";

const input = { params: { groupId: "G1" }, subscriptionId: "s" };
const rec = (id: number) => ({ id, email: `r${id}@example.com`, registered: 1762689600 + id });

test("new-receiver seeds, emits only the new receiver, retries identically", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: [rec(1)] }]).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  const page = [rec(2), rec(1)];
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: page }]).ctx,
  );
  assertEquals(first.events, [rec(2)]);
  assertEquals(
    await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([{ body: page }]).ctx),
    first,
  );
});

test("new-receiver requests the group's receivers newest-registered first", async () => {
  const run = mockCtx([{ body: [] }]);
  await trigger.poll!({ ...input, state: {} }, run.ctx);
  assertEquals(run.calls.map((c) => [c.method, c.url]), [[
    "GET",
    "https://rest.cleverreach.com/v3/groups/G1/receivers?pagesize=100&order_by=registered+desc",
  ]]);
});
