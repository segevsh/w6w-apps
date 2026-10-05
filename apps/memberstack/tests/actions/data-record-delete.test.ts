import { assertEquals, assertRejects } from "@std/assert";
import del from "../../actions/data-record-delete.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("data-record-delete: DELETEs the record and returns the deleted record", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec_1", tableKey: "products" } }]);
  const out = await del.execute({ tableKey: "products", recordId: "rec_1" }, ctx) as {
    id: string;
  };
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/data-tables/products/records/rec_1");
  assertEquals(out.id, "rec_1");
});

Deno.test("data-record-delete: 404 Data record not found surfaces", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Data record not found") }]);
  await assertRejects(
    () => Promise.resolve(del.execute({ tableKey: "t", recordId: "x" }, ctx)),
    Error,
    "Data record not found",
  );
});
