import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-list: unwraps data and meta", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ id: "w1" }], meta: { total: 1, quota: { current: 1, limit: 10 } } },
  }]);
  const out = await action.execute!({ companyId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/webhook_endpoints");
  assertEquals(out, { endpoints: [{ id: "w1" }], total: 1, quota: { current: 1, limit: 10 } });
});
