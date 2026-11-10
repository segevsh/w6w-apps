import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { envelope, mockWrikeCtx, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-task.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({ id });
const ctx = (ids: string[]) => mockWrikeCtx([{ status: 200, body: envelope(ids.map(item)) }]);

test("new-task: seeds, emits only new tasks, retries idempotently", async () => {
  const seed = ctx(["a"]);
  const s = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(s.events, []);
  assertEquals((s.nextState as { seeded: boolean }).seeded, true);
  const later = { ...input, state: s.nextState };
  const first = await trigger.poll!(later, ctx(["b", "a"]).ctx);
  assertEquals(first.events, [item("b")]);
  assertEquals(await trigger.poll!(later, ctx(["b", "a"]).ctx), first);
});

test("new-task: requests the documented Desc sort on CreatedDate, newest first", async () => {
  const seed = ctx(["a"]);
  await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seed.calls[0].method, "GET");
  // Wrike documents sortOrder as the case-sensitive enum `Asc | Desc`.
  assertEquals(queryOf(seed.calls[0].url), {
    sortField: "CreatedDate",
    sortOrder: "Desc",
    pageSize: "100",
  });
});
