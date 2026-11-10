import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";
import trigger from "../../triggers/new-list.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const dict = (...ids: string[]) =>
  Object.fromEntries(ids.map((id) => [id, { name: `List ${id}` }]));
const ctx = (body: unknown) => mockCtx([{ status: 200, body }]);

test("new-list seeds, emits only the new list, and retries identically", async () => {
  const seed = ctx(dict("1", "2"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "POST");
  assertEquals(pathOf(seed.calls[0].url), "/api/1/getLists/");
  assertEquals(formOf(seed.calls[0]), {});
  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx(dict("1", "2", "3")).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    ctx(dict("1", "2", "3")).ctx,
  );
  assertEquals(first.events, [{ id: "3", list: { name: "List 3" } }]);
  assertEquals(retry, first);
});

test("new-list treats a non-dictionary answer as no lists", async () => {
  const seeded = await trigger.poll!({ ...input, state: {} }, ctx(dict("1")).ctx);
  const empty = await trigger.poll!({ ...input, state: seeded.nextState }, ctx([]).ctx);
  assertEquals(empty.events, []);
});

test("new-list refuses more than 5000 lists (the kit cap)", async () => {
  const ids = Array.from({ length: 5001 }, (_, i) => String(i));
  await assertRejects(
    () => trigger.poll!({ ...input, state: {} }, ctx(dict(...ids)).ctx),
    Error,
    "5000",
  );
});
