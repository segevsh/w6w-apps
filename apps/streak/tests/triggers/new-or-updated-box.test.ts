import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-box.ts";

const input = { params: { pipelineKey: "pipe1" }, subscriptionId: "sub-1" };
const ctx = (items: unknown[]) => mockCtx([{ body: items }]);
const item = (
  id: number,
  v = 0,
) => ({
  key: `box_${id}`,
  name: "b",
  creationTimestamp: 1762646400000 + id,
  lastUpdatedTimestamp: v,
});

test("new-or-updated-box: seeds without emitting", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-box: emits only the new record after the seed", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2), item(1)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(3), item(2), item(1)]).ctx,
  );
  assertEquals(next.events, [item(3)]);
});

test("new-or-updated-box: an edited record is emitted again, an unchanged one is not", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2, 20), item(1, 10)]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item(1, 30), item(2, 20)]).ctx,
  );
  assertEquals(next.events, [item(1, 30)]);
});

test("new-or-updated-box: the same state and response give an identical result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item(2)]).ctx);
  const page = [item(3), item(2)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const again = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item(3)]);
  assertEquals(again, first);
});

test("new-or-updated-box: sends the list request (sortBy=lastUpdatedTimestamp, documented descending)", async () => {
  const m = ctx([item(1)]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(
    m.calls[0].url,
    "https://api.streak.com/api/v1/pipelines/pipe1/boxes?sortBy=lastUpdatedTimestamp&page=0&limit=100",
  );
});
