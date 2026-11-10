import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-habit.ts";

// Shape (c): GET /open/v1/habit returns every habit in one bare array, with no paging.
const input = { params: {}, subscriptionId: "sub-1" };
const habit = (id: string) => ({ id, name: `Habit ${id}` });
const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

test("new-habit: seeds without emitting, then emits exactly the added habit (idempotent)", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([habit("h1")]).ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);

  const rows = [habit("h1"), habit("h2")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(rows).ctx);
  assertEquals(first.events, [habit("h2")]);
  assertEquals(retry, first);
  // An edited or removed habit is not a "new habit".
  const quiet = await trigger.poll!(
    { ...input, state: first.nextState },
    ctx([{ ...habit("h1"), name: "Renamed" }]).ctx,
  );
  assertEquals(quiet.events, []);
});

test("new-habit: requests the habit collection", async () => {
  const m = ctx([habit("h1")]);
  await trigger.poll!({ ...input, state: {} }, m.ctx);
  assertEquals(m.calls.length, 1);
  assertEquals(m.calls[0].method, "GET");
  assertEquals(m.calls[0].url, "https://api.ticktick.com/open/v1/habit");
});

test("new-habit: emits the flat habit that output and sample declare", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([]).ctx);
  const out = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([habit("h9")]).ctx);
  const event = out.events[0] as Record<string, unknown>;
  for (const f of trigger.output) assertEquals(f.key in event, true, f.key);
  assertEquals(Object.keys(trigger.sample as object).sort(), ["id", "name"]);
  assertEquals(event.id, "h9");
  assertEquals(trigger.minIntervalMs, 300_000);
});
