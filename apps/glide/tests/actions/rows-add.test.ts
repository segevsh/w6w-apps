import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import rowsAdd from "../../actions/rows-add.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

test("rows-add: POSTs the rows array as the whole body (no wrapper)", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ rowIDs: ["r1", "r2"] }) }]);
  const out = await rowsAdd.execute({
    tableId: "t1",
    rows: [{ fullName: "Ada" }, { fullName: "Bea" }],
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/tables/t1/rows");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), [{ fullName: "Ada" }, { fullName: "Bea" }]);
  assertEquals(out, { rowIDs: ["r1", "r2"] });
});

test("rows-add: accepts a stash reference in place of an inline array", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ rowIDs: [] }) }]);
  await rowsAdd.execute({ tableId: "t1", rows: { $stashID: "job-1" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { $stashID: "job-1" });
});

test("rows-add: onSchemaError is a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ rowIDs: [] }) }]);
  await rowsAdd.execute({ tableId: "t1", rows: [], onSchemaError: "abort" }, ctx);
  assertEquals(queryOf(calls[0].url), { onSchemaError: "abort" });
});

test("rows-add: not idempotent — no idempotency key on this endpoint", () => {
  assertEquals(rowsAdd.idempotent, false);
});
