import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-row.ts";

Deno.test("update-row: PUTs the row wrapped as { row: { cells } }", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { requestId: "req-1", id: "row-1" } }]);
  const out = await action.execute({
    docId: "doc-1",
    tableId: "grid-1",
    rowId: "row-1",
    row: { Status: "Done" },
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/apis/v1/docs/doc-1/tables/grid-1/rows/row-1");
  const sent = JSON.parse(calls[0].body ?? "{}");
  assertEquals(sent.row, { cells: [{ column: "Status", value: "Done" }] });
  assertEquals(out.requestId, "req-1");
  assertEquals(out.id, "row-1");
});
