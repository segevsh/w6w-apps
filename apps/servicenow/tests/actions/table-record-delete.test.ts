import { assertEquals } from "@std/assert";
import { mockServiceNowCtx } from "../_helpers.ts";
import action from "../../actions/table-record-delete.ts";

Deno.test("table-record-delete: DELETEs /table/{table}/{sysId} and reports success", async () => {
  const { ctx, calls } = mockServiceNowCtx([{ status: 204 }]);
  const out = await action.execute({ table: "problem", sysId: "abc" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://acme.service-now.com/api/now/table/problem/abc");
  assertEquals(out, { deleted: true });
});
