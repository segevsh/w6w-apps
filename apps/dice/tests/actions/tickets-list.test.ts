import { test } from "node:test";
import assert from "node:assert/strict";
import action from "../../actions/tickets-list.ts";
import { mockCtx } from "../_helpers.ts";
import { connection, record } from "../fixtures.ts";

test("tickets-list: fetches a bounded page, binds filters and forwards cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { tickets: connection } } } }]);
  const out = await action.execute(
    { first: 10, after: "opaque", ...{ "eventId": "event-1" } },
    ctx,
  );
  assert.deepEqual(out.rows, [record]);
  const body = JSON.parse(calls[0].body!);
  assert.match(body.query, /tickets\(first: \$first, after: \$after, where: \$where\)/);
  assert.match(body.query, /\$where: TicketWhereInput/);
  assert.deepEqual(body.variables, {
    first: 10,
    after: "opaque",
    ...{ "where": { "eventId": { "eq": "event-1" } } },
  });
  assert.equal(calls.length, 1);
});
test("tickets-list: defaults page size and preserves native where", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { tickets: connection } } } }]);
  await action.execute({ where: JSON.stringify({ "id": { "eq": "row-1" } }) }, ctx);
  assert.deepEqual(JSON.parse(calls[0].body!).variables, {
    first: 50,
    where: { "id": { "eq": "row-1" } },
  });
});
test("tickets-list: invalid pagination and filters fail before network", async () => {
  const { ctx, calls } = mockCtx();
  for (const first of [0, -1, 501, 1.5, "2"]) {
    await assert.rejects(async () => await action.execute({ first }, ctx), /first/);
  }
  await assert.rejects(async () => await action.execute({ where: [] }, ctx), /where/);
  assert.equal(calls.length, 0);
});
test("tickets-list: inaccessible resource is not an empty success", async () => {
  const { ctx } = mockCtx([{ body: { data: { viewer: { tickets: null } } } }]);
  await assert.rejects(async () => await action.execute({}, ctx), /connection/);
});

test("tickets-list: conflicting filters are refused", async () => {
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
