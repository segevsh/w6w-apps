import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-entity.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const entity = (id: string, lastUpdated: string) => ({ id, name: `Entity ${id}`, lastUpdated });

test("new-or-updated-entity: seeds, emits new and edited entities, retries identically, sends the literal request", async () => {
  const old = entity("e1", "2026-11-01T00:00:00Z");
  const seed = mockCtx([{ body: page([old]) }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(pathOf(seed.calls[0].url), "/public/api/v1/entities");
  assertEquals(queryOf(seed.calls[0].url), {
    page: "0",
    pageSize: "100",
    sortField: "lastUpdated",
    sortDirection: "DESC",
  });
  const fresh = entity("e2", "2026-11-09T00:00:00Z");
  const edited = entity("e1", "2026-11-10T00:00:00Z");
  const resp = { body: page([edited, fresh, old]) };
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([resp]).ctx);
  const second = await trigger.poll!({ ...input, state: seeded.nextState }, mockCtx([resp]).ctx);
  assertEquals(first.events, [fresh, edited]);
  assertEquals(first, second);
});
