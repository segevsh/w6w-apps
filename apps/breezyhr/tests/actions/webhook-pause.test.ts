import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-pause.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-pause: POSTs to /pause with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", status: "paused", enabled: false } }]);
  const out = await action.execute!({ companyId: "c1", endpointId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/webhook_endpoint/w1/pause");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
  assertEquals(out, { id: "w1", status: "paused", enabled: false });
});
