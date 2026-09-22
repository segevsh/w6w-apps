import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tables.ts";

Deno.test("list-tables: GETs /applications/ and returns the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "tbl1", name: "Contacts" }] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/applications/");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, [{ id: "tbl1", name: "Contacts" }]);
});
