import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upsert-rows.ts";

Deno.test("upsert-rows: POSTs rows converted to cells, with keyColumns when supplied", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { requestId: "req-1", addedRowIds: [], updatedRowIds: ["row-1"] },
  }]);
  const out = await action.execute({
    docId: "doc-1",
    tableId: "grid-1",
    rows: [{ Name: "Widget", "c-price": 9.99 }],
    keyColumns: ["Name"],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/apis/v1/docs/doc-1/tables/grid-1/rows");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.rows, [{
    cells: [{ column: "Name", value: "Widget" }, { column: "c-price", value: 9.99 }],
  }]);
  assertEquals(sent.keyColumns, ["Name"]);
  assertEquals(out.requestId, "req-1");
});

Deno.test("upsert-rows: omits keyColumns from the body when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { requestId: "req-2" } }]);
  await action.execute({ docId: "doc-1", tableId: "grid-1", rows: [{ Name: "New" }] }, ctx);
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals("keyColumns" in sent, false);
});
