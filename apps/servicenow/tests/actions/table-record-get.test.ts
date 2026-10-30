import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/table-record-get.ts";

test("table-record-get: GETs /table/{table}/{sysId}", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ body: { result: { sys_id: "abc" } } }]);
  const out = await action.execute({ table: "problem", sysId: "abc" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/problem/abc");
  assertEquals(out, { result: { sys_id: "abc" } });
});
