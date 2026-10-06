import { assertEquals } from "@std/assert";
import action from "../../actions/webhook-resume.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("webhook-resume: POSTs to /resume with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "w1", status: "active", enabled: true } }]);
  const out = await action.execute!({ companyId: "c1", endpointId: "w1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1/webhook_endpoint/w1/resume");
  assertEquals(calls[0].method, "POST");
  assertEquals(out, { id: "w1", status: "active", enabled: true });
});
