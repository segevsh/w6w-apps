import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-delete: DELETEs and returns the JSON confirmation", async () => {
  const body = { success: true, message: "deleted", endpoint_id: "w1" };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute!({ companyId: "c1", endpointId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/webhook_endpoint/w1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, body);
});
