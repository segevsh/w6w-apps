import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-record.ts";

Deno.test("get-record: GETs /applications/{tableId}/records/{recordId}/", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "rec1" } }]);
  const result = await action.execute!({ tableId: "tbl1", recordId: "rec1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/tbl1/records/rec1/");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { id: "rec1" });
});
