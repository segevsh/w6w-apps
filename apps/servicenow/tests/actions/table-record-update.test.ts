import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/table-record-update.ts";

Deno.test("table-record-update: PATCHes /table/{table}/{sysId} with the given fields", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: {} } }]);
  await action.execute({ table: "problem", sysId: "abc", fields: { state: "3" } }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/problem/abc");
  assertEquals(JSON.parse(calls[0].body!), { state: "3" });
});
