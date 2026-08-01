import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-columns.ts";

Deno.test("list-columns: GETs /docs/{docId}/tables/{tableId}/columns", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "c-1", name: "Name" }] } }]);
  const out = await action.execute({ docId: "doc-1", tableId: "grid-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/apis/v1/docs/doc-1/tables/grid-1/columns");
  assertEquals(out.items[0].name, "Name");
});
