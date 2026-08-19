import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/record-create.ts";

const D = { display: { host: "https://nocodb.internal" } };

/** The array form is one request rather than N, which is the whole point. */
Deno.test("record-create: sends an array as one request and returns the ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ Id: 10 }, { Id: 11 }] }], D);
  const result = await action.execute({
    tableId: "mtbl1",
    records: '[{"Title":"A"},{"Title":"B"}]',
  }, ctx) as Record<string, unknown>;

  assertEquals(calls.length, 1, "a bulk insert must not become two requests");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!).length, 2);
  assertEquals(result.ids, [10, 11]);
  assertEquals(result.count, 2);
});

/** NocoDB accepts either shape; a single record goes as an object. */
Deno.test("record-create: a single record is sent as an object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 10 } }], D);
  const result = await action.execute(
    { tableId: "mtbl1", records: '{"Title":"A"}' },
    ctx,
  ) as Record<
    string,
    unknown
  >;
  assert(!Array.isArray(JSON.parse(calls[0].body!)), "one record goes as an object");
  assertEquals(result.count, 1);
});

Deno.test("record-create: reports which columns were written", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ Id: 10 }] }], D);
  const result = await action.execute({
    tableId: "mtbl1",
    records: '[{"Title":"A","Status":"New"},{"Title":"B"}]',
  }, ctx) as Record<string, unknown>;
  assertEquals(result.columns, ["Title", "Status"]);
});

Deno.test("record-create: refuses an empty list or a non-object record", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", records: "[]" }, ctx),
    Error,
    "at least one record",
  );
  const err = await assertRejects(
    async () => await action.execute({ tableId: "mtbl1", records: '["nope"]' }, ctx),
    Error,
  );
  assert(/these are not: 0/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** The values are the customer's data. */
Deno.test("record-create: logs the count, never the values", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: [{ Id: 10 }] }], D);
  await action.execute({ tableId: "mtbl1", records: '[{"Email":"ada@example.com"}]' }, ctx);
  assert(!/ada@example\.com/.test(JSON.stringify(logs)), JSON.stringify(logs));
});

Deno.test("record-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
