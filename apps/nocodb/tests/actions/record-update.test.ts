import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-update.ts";

const D = { display: { host: "https://nocodb.internal" } };

/** The id travels in the body, which is what makes this a bulk endpoint. */
test("record-update: patches with the ids in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ Id: 1 }, { Id: 2 }] }], D);
  const result = await action.execute({
    tableId: "mtbl1",
    records: '[{"Id":1,"Status":"Done"},{"Id":2,"Status":"Done"}]',
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls.length, 1, "a bulk update must not become two requests");
  assertEquals(result.ids, [1, 2]);
  assertEquals(result.columns, ["Status"]);
});

/** An update with no id is an error NocoDB reports as a missing field. */
test("record-update: refuses records with no primary key", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", records: '[{"Status":"Done"}]' }, ctx),
    Error,
  );
  assert(/must carry its `Id`/.test(err.message), err.message);
  assert(/use `record-create` for that/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** A base built on an existing database may key on something else. */
test("record-update: honours a different primary key column", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ sku: "A1" }] }], D);
  const result = await action.execute({
    tableId: "mtbl1",
    records: '[{"sku":"A1","Status":"Done"}]',
    idField: "sku",
  }, ctx) as Record<string, unknown>;
  assertEquals(result.ids, ["A1"]);
  assertEquals(result.columns, ["Status"], "the key column is not a written column");
  assertEquals(JSON.parse(calls[0].body!).sku, "A1");
});

/** Clearing a field means sending null, not omitting it. */
test("record-update: names the fields explicitly set to null", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ Id: 1 }] }], D);
  const result = await action.execute({
    tableId: "mtbl1",
    records: '[{"Id":1,"Assignee":null,"Status":"Done"}]',
  }, ctx) as Record<string, unknown>;
  assertEquals(result.clearedFields, ["Assignee"]);
});

test("record-update: says there is no conditional update", () => {
  assert(/concurrent writes race silently/.test(action.description!), action.description);
  assertEquals(action.idempotent, true);
});
