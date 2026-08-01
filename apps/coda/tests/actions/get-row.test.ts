import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-row.ts";

Deno.test("get-row: GETs /docs/{docId}/tables/{tableId}/rows/{rowId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "row-1", values: { Name: "Widget" } } }]);
  const out = await action.execute({ docId: "doc-1", tableId: "grid-1", rowId: "row-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/apis/v1/docs/doc-1/tables/grid-1/rows/row-1");
  assertEquals(url.searchParams.get("useColumnNames"), "true");
  assertEquals(out.values.Name, "Widget");
});
