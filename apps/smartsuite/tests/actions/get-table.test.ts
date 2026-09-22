import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-table.ts";

Deno.test("get-table: GETs /applications/{tableId}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tbl1", name: "Contacts" } }]);
  const result = await action.execute!({ tableId: "tbl1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "tbl1", name: "Contacts" });
});
