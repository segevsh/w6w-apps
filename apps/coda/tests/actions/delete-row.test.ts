import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-row.ts";

Deno.test("delete-row: DELETEs /docs/{docId}/tables/{tableId}/rows/{rowId}", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { requestId: "req-1" } }]);
  const out = await action.execute({ docId: "doc-1", tableId: "grid-1", rowId: "row-1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/apis/v1/docs/doc-1/tables/grid-1/rows/row-1");
  assertEquals(out.requestId, "req-1");
});
