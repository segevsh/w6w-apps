import { test } from "node:test";
import assert from "node:assert/strict";
import action from "../../actions/genre-types-list.ts";
import { mockCtx } from "../_helpers.ts";
import { connection, record } from "../fixtures.ts";

test("genre-types-list: fetches a bounded page, binds filters and forwards cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { genreTypes: connection } } } }]);
  const out = await action.execute({ first: 10, after: "opaque", ...{} }, ctx);
  assert.deepEqual(out.rows, [record]);
  const body = JSON.parse(calls[0].body!);
  assert.match(body.query, /genreTypes\(first: \$first, after: \$after, where: \$where\)/);
  assert.match(body.query, /\$where: GenreTypeWhereInput/);
  assert.deepEqual(body.variables, { first: 10, after: "opaque", ...{} });
  assert.equal(calls.length, 1);
});
test("genre-types-list: defaults page size and preserves native where", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { viewer: { genreTypes: connection } } } }]);
  await action.execute({ where: JSON.stringify({ "name": { "eq": "Music" } }) }, ctx);
  assert.deepEqual(JSON.parse(calls[0].body!).variables, {
    first: 50,
    where: { "name": { "eq": "Music" } },
  });
});
test("genre-types-list: invalid pagination and filters fail before network", async () => {
  const { ctx, calls } = mockCtx();
  for (const first of [0, -1, 501, 1.5, "2"]) {
    await assert.rejects(async () => await action.execute({ first }, ctx), /first/);
  }
  await assert.rejects(async () => await action.execute({ where: [] }, ctx), /where/);
  assert.equal(calls.length, 0);
});
test("genre-types-list: inaccessible resource is not an empty success", async () => {
  const { ctx } = mockCtx([{ body: { data: { viewer: { genreTypes: null } } } }]);
  await assert.rejects(async () => await action.execute({}, ctx), /connection/);
});
