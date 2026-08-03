import { assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import action from "../../actions/delete-records.ts";

Deno.test("delete-records: POSTs to the /records/delete sub-path, not DELETE", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "People", rowIds: [101, 102] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/docs/d/tables/People/records/delete");
});

Deno.test("delete-records: sends a BARE array body, with no records envelope", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  await action.execute!({ docId: "d", tableId: "T", rowIds: [101, 102, 103] }, ctx);
  assertEquals(calls[0].body, "[101,102,103]");
});

Deno.test("delete-records: echoes the ids, because Grist returns nothing", async () => {
  const { ctx } = actionCtx([{ status: 200, body: "" }]);
  const out = await action.execute!({ docId: "d", tableId: "T", rowIds: [5] }, ctx);
  assertEquals(out.deleted, [5]);
});

Deno.test("delete-records: an empty list still sends a well-formed array", async () => {
  const { ctx, calls } = actionCtx([{ status: 200, body: "" }]);
  const out = await action.execute!({ docId: "d", tableId: "T", rowIds: [] }, ctx);
  assertEquals(calls[0].body, "[]");
  assertEquals(out.deleted, []);
});

Deno.test("delete-records: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
