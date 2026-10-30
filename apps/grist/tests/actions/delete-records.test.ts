import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { actionCtx } from "../_helpers.ts";
import action from "../../actions/delete-records.ts";

test("delete-records: POSTs to the /records/delete sub-path, not DELETE", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "People", rowIds: [101, 102] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/People/records/delete");
});

test("delete-records: sends a BARE array body, with no records envelope", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "T", rowIds: [101, 102, 103] }, ctx);
  assertEquals(calls[0].body, "[101,102,103]");
});

test("delete-records: echoes the ids, because Grist returns nothing", async () => {
  const { ctx } = actionCtx([{ status: 200, body: "" }]);
  const out = await action.execute!({ docId: "d", tableId: "T", rowIds: [5] }, ctx);
  assertEquals(out.deleted, [5]);
});

test("delete-records: an empty list still sends a well-formed array", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  const out = await action.execute!({ docId: "d", tableId: "T", rowIds: [] }, ctx);
  assertEquals(calls[0].body, "[]");
  assertEquals(out.deleted, []);
});

test("delete-records: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
