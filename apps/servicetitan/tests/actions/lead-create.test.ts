import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("lead-create: POSTs campaign, summary and prospect details, omitting unset fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 11, status: "Open" } }], conn);
  await action.execute!(
    {
      campaignId: 4,
      summary: "Needs AC",
      leadCustomerName: "Bo",
      leadPhone: "555",
      tagTypeIds: "1",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.servicetitan.io/crm/v2/tenant/42/leads");
  assertEquals(JSON.parse(calls[0].body!), {
    campaignId: 4,
    summary: "Needs AC",
    leadCustomerName: "Bo",
    leadPhone: "555",
    tagTypeIds: [1],
  });
  assertEquals(action.idempotent, false);
});
