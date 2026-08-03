import { assertEquals } from "@std/assert";
import { mockQbCtx } from "../_helpers.ts";
import action from "../../actions/delete-table.ts";

Deno.test("delete-table: DELETEs the table with the appId query", async () => {
  const { ctx, calls } = mockQbCtx([{ body: { deletedTableId: "bck1" } }]);
  const out = await action.execute({ tableId: "bck1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/tables/bck1");
  assertEquals(new URL(calls[0].url).searchParams.get("appId"), "bqrapp1");
  assertEquals(out.deletedTableId, "bck1");
});
