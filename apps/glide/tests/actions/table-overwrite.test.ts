import { test } from "node:test";
import { assert, assertEquals, assertThrows } from "../_assert.ts";
import tableOverwrite from "../../actions/table-overwrite.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("table-overwrite: PUTs schema/rows to /tables/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ jobID: "j1" }) }]);
  const out = await tableOverwrite.execute({ tableId: "t1", rows: [] }, ctx);

  assertEquals(pathOf(calls[0].url), "/tables/t1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), { rows: [] });
  assertEquals(out, { jobID: "j1" });
});

test("table-overwrite: forwards a valid If-Match header", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ jobID: "j1" }) }]);
  await tableOverwrite.execute({ tableId: "t1", rows: [], ifMatch: '"7"' }, ctx);
  assertEquals(calls[0].headers["if-match"], '"7"');
});

test("table-overwrite: rejects a malformed If-Match before making a request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => tableOverwrite.execute({ tableId: "t1", rows: [], ifMatch: "7" }, ctx));
  assertEquals(calls.length, 0);
});

test("table-overwrite: onSchemaError travels as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ jobID: "j1" }) }]);
  await tableOverwrite.execute({ tableId: "t1", rows: [], onSchemaError: "dropColumns" }, ctx);
  assertEquals(queryOf(calls[0].url), { onSchemaError: "dropColumns" });
});

test("table-overwrite: table id is escaped in the path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ jobID: "j1" }) }]);
  await tableOverwrite.execute({ tableId: "weird/id?x", rows: [] }, ctx);
  assert(calls[0].url.includes(encodeURIComponent("weird/id?x")));
});
