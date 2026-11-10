import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-event.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (items: unknown[]) => mockCtx([{ body: items }]);

test("new-event: first check seeds and emits nothing", async () => {
  const seed = ctx([item("b"), item("a")]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
});

test("new-event: emits only the new item after seeding", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const next = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([item("b"), item("a")]).ctx,
  );
  assertEquals(next.events, [item("b")]);
  const quiet = await trigger.poll!(
    { ...input, state: next.nextState },
    ctx([item("b"), item("a")]).ctx,
  );
  assertEquals(quiet.events, []);
});

test("new-event: retrying the same state and page is idempotent", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([item("a")]).ctx);
  const page = [item("c"), item("b"), item("a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(page).ctx);
  assertEquals(first.events, [item("b"), item("c")]);
  assertEquals(retry, first);
});

test("new-event: requests the wrapped list action newest first", async () => {
  const seed = ctx([item("a")]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://donorbox.org/api/v1/events?page=1&per_page=100&order=desc",
  );
});
