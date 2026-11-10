import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-mailing-list.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const list = (id: number) => ({ id, name: `list ${id}` });
const ctx = (...pages: unknown[][]) => mockCtx(pages.map((body) => ({ body })));
const full = (from: number) => Array.from({ length: 100 }, (_, i) => list(from + i));

test("new-mailing-list: seeds without flooding and requests the lists", async () => {
  const seed = ctx([list(1)]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls.length, 1);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(seed.calls[0].url, "https://api.sendpulse.com/addressbooks?limit=100&offset=0");
});

test("new-mailing-list: emits only the list that was added", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([list(1)]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([list(1), list(2)]).ctx,
  );
  assertEquals(result.events, [list(2)]);
});

test("new-mailing-list: the same state and responses give the same result", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([list(1)]).ctx);
  const data = [list(1), list(2)];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(data).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, ctx(data).ctx);
  assertEquals(first.events.length, 1);
  assertEquals(retry, first);
});

test("new-mailing-list: a list on the second page is read with the next offset", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(full(1), [list(101)]).ctx);
  const m = ctx(full(1), [list(101), list(102)]);
  const result = await trigger.poll!({ ...input, state: seeded.nextState }, m.ctx);
  assertEquals(result.events, [list(102)]);
  assertEquals(m.calls[1].url, "https://api.sendpulse.com/addressbooks?limit=100&offset=100");
});

test("new-mailing-list: a renamed existing list is not a new list", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx([list(1)]).ctx);
  const result = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx([{ ...list(1), name: "renamed" }]).ctx,
  );
  assertEquals(result.events, []);
});

test("new-mailing-list: an account beyond the page cap is refused, not truncated", async () => {
  const pages = Array.from({ length: 10 }, (_, i) => full(i * 100 + 1));
  await assertRejects(
    () => trigger.poll!({ ...input, state: {} }, ctx(...pages).ctx) as Promise<unknown>,
    "at most 1000",
  );
});
