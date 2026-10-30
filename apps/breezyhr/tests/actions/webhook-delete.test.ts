import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/webhook-delete.ts";
import { mockCtx } from "../_helpers.ts";

test("webhook-delete: DELETEs and returns the JSON confirmation", async () => {
  const body = { success: true, message: "deleted", endpoint_id: "w1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ companyId: "c1", endpointId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/webhook_endpoint/w1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, body);
});
