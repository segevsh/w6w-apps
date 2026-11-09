import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-record.ts";

const params = { baseId: "appABC", table: "Orders", createdTimeField: "Created" };
const record1 = { id: "rec1", createdTime: "2026-11-09T10:00:00.000Z", fields: { Name: "First" } };
const record2 = { id: "rec2", createdTime: "2026-11-09T11:00:00.000Z", fields: { Name: "Second" } };

test("new-record: seeds without emitting existing records", async () => {
  const { ctx } = mockCtx([{ body: { records: [record1] } }]);
  const result = await trigger.poll!({ params, state: {} }, ctx);
  assertEquals(result.events, []);
  assertEquals(result.nextState.seeded, true);
});

test("new-record: emits a record that arrives after the seed", async () => {
  const { ctx } = mockCtx([{ body: { records: [record1] } }, {
    body: { records: [record2, record1] },
  }]);
  const seed = await trigger.poll!({ params, state: {} }, ctx);
  const result = await trigger.poll!({ params, state: seed.nextState }, ctx);
  assertEquals(result.events, [record2]);
});

test("new-record: is idempotent for the same state and response", async () => {
  const state = { v: 1, kind: "ids", seeded: true, ids: [record1.id] };
  const a = mockCtx([{ body: { records: [record2, record1] } }]);
  const b = mockCtx([{ body: { records: [record2, record1] } }]);
  assertEquals(
    await trigger.poll!({ params, state }, a.ctx),
    await trigger.poll!({ params, state }, b.ctx),
  );
});

test("new-record: calls list records with literal created-time descending sort", async () => {
  const { ctx, calls } = mockCtx([{ body: { records: [] } }]);
  await trigger.poll!({ params, state: {} }, ctx);
  assertEquals(
    { method: calls[0].method, url: calls[0].url },
    {
      method: "GET",
      url:
        "https://api.airtable.com/v0/appABC/Orders?sort%5B0%5D%5Bfield%5D=Created&sort%5B0%5D%5Bdirection%5D=desc&pageSize=100",
    },
  );
});
