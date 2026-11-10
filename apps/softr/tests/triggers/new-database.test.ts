import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-database.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const db = (id: string, name: string) => ({
  id,
  name,
  workspaceId: "w1",
  tablesCount: 1,
  createdAt: "2026-11-09T09:00:00Z",
  updatedAt: "2026-11-09T09:00:00Z",
});
const DB_URL = "https://tables-api.softr.io/api/v1/databases";
const keys = (r: { events: unknown[] }) => r.events.map((e) => (e as { key: string }).key);

test("new-database: first check seeds the snapshot without events", async () => {
  const c = mockCtx([{ body: { data: [db("a", "CRM")] } }]);
  const r = await trigger.poll!({ ...input, state: {} }, c.ctx);
  assertEquals(r.events, []);
  assertEquals((r.nextState as { seeded: boolean }).seeded, true);
  assertEquals(c.calls[0].method, "GET");
  assertEquals(c.calls[0].url, DB_URL);
});

test("new-database: a database added after the seed is emitted once; a retry is identical", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [db("a", "CRM")] } }]).ctx,
  );
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { data: [db("a", "CRM"), db("b", "Sales")] } }]).ctx,
    );
  const first = await run();
  assertEquals(keys(first), ["b"]);
  assertEquals((first.events[0] as { change: string }).change, "added");
  assertEquals(await run(), first);
  const again = await trigger.poll!(
    { ...input, state: first.nextState },
    mockCtx([{ body: { data: [db("a", "CRM"), db("b", "Sales")] } }]).ctx,
  );
  assertEquals(again.events, []);
});

test("new-database: a renamed database is not a new one", async () => {
  const seeded = await trigger.poll!(
    { ...input, state: {} },
    mockCtx([{ body: { data: [db("a", "CRM")] } }]).ctx,
  );
  const r = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([{ body: { data: [db("a", "CRM v2")] } }]).ctx,
  );
  assertEquals(r.events, []);
});
