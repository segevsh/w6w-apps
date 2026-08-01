import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-rows.ts";

Deno.test("delete-rows: DELETEs the table's rows endpoint with a rowIds body", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { requestId: "req-1" } }]);
  const out = await action.execute({
    docId: "doc-1",
    tableId: "grid-1",
    rowIds: ["row-1", "row-2"],
  }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/apis/v1/docs/doc-1/tables/grid-1/rows");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.rowIds, ["row-1", "row-2"]);
  assertEquals(out.requestId, "req-1");
});
