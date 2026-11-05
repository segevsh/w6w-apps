import { test } from "node:test";
import assert from "node:assert/strict";
import action from "../../actions/returns-list.ts";
import { mockCtx } from "../_helpers.ts";
import { connection, record } from "../fixtures.ts";

test("returns-list: fetches a bounded page, binds filters and forwards cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { returns: connection } } } }]);
  const out = await action.execute(
    { first: 10, after: "opaque", ...{ "eventId": "event-1" } },
    ctx,
  );
  assert.deepEqual(out.rows, [record]);
  const body = JSON.parse(calls[0].body!);
  assert.match(body.query, /returns\(first: \$first, after: \$after, where: \$where\)/);
  assert.match(body.query, /\$where: ReturnWhereInput/);
  assert.deepEqual(body.variables, {
    first: 10,
    after: "opaque",
    ...{ "where": { "eventId": { "eq": "event-1" } } },
  });
  assert.equal(calls.length, 1);
});
test("returns-list: defaults page size and preserves native where", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { returns: connection } } } }]);
  await action.execute({ where: JSON.stringify({ "id": { "eq": "row-1" } }) }, ctx);
  assert.deepEqual(JSON.parse(calls[0].body!).variables, {
    first: 50,
    where: { "id": { "eq": "row-1" } },
  });
});
test("returns-list: invalid pagination and filters fail before network", async () => {
  const { ctx, calls } = mockCtx();
  for (const first of [0, -1, 501, 1.5, "2"]) {
    await assert.rejects(async () => await action.execute({ first }, ctx), /first/);
  }
  await assert.rejects(async () => await action.execute({ where: [] }, ctx), /where/);
  assert.equal(calls.length, 0);
});
test("returns-list: inaccessible resource is not an empty success", async () => {
  const { ctx } = mockCtx([{ body: { data: { viewer: { returns: null } } } }]);
  await assert.rejects(async () => await action.execute({}, ctx), /connection/);
});

test("returns-list: conflicting filters are refused", async () => {
  const { ctx } = mockCtx();
  await assert.rejects(
    async () =>
      await action.execute(
        { ...{ "eventId": "event-1" }, where: { "eventId": { "eq": "event-1" } } },
        ctx,
      ),
    /duplicates/,
  );
});
