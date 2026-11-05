import { test } from "node:test";
import assert from "node:assert/strict";
import action from "../../actions/events-list.ts";
import { mockCtx } from "../_helpers.ts";
import { connection, record } from "../fixtures.ts";

test("events-list: fetches a bounded page, binds filters and forwards cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { events: connection } } } }]);
  const out = await action.execute({
    first: 10,
    after: "opaque",
    ...{ "startsAfter": "2026-11-05T00:00:00Z" },
  }, ctx);
  assert.deepEqual(out.rows, [record]);
  const body = JSON.parse(calls[0].body!);
  assert.match(body.query, /events\(first: \$first, after: \$after, where: \$where\)/);
  assert.match(body.query, /\$where: EventWhereInput/);
  assert.deepEqual(body.variables, {
    first: 10,
    after: "opaque",
    ...{ "where": { "startDatetime": { "gte": "2026-11-05T00:00:00Z" } } },
  });
  assert.equal(calls.length, 1);
});
test("events-list: defaults page size and preserves native where", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { events: connection } } } }]);
  await action.execute({ where: JSON.stringify({ "id": { "eq": "row-1" } }) }, ctx);
  assert.deepEqual(JSON.parse(calls[0].body!).variables, {
    first: 50,
    where: { "id": { "eq": "row-1" } },
  });
});
test("events-list: invalid pagination and filters fail before network", async () => {
  const { ctx, calls } = mockCtx();
  for (const first of [0, -1, 501, 1.5, "2"]) {
    await assert.rejects(async () => await action.execute({ first }, ctx), /first/);
  }
  await assert.rejects(async () => await action.execute({ where: [] }, ctx), /where/);
  assert.equal(calls.length, 0);
});
test("events-list: inaccessible resource is not an empty success", async () => {
  const { ctx } = mockCtx([{ body: { data: { viewer: { events: null } } } }]);
  await assert.rejects(async () => await action.execute({}, ctx), /connection/);
});

test("events-list: conflicting filters are refused", async () => {
  const { ctx } = mockCtx();
  await assert.rejects(
    async () =>
      await action.execute({
        ...{ "startsAfter": "2026-11-05T00:00:00Z" },
        where: { "startDatetime": { "gte": "2026-11-05T00:00:00Z" } },
      }, ctx),
    /duplicates/,
  );
});
