import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("lead-list: GETs /crm/v2/tenant/{t}/leads by status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ status: "Open", leadPhone: "555" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.servicetitan.io/crm/v2/tenant/42/leads");
  assertEquals(url.searchParams.get("status"), "Open");
  assertEquals(url.searchParams.get("leadPhone"), "555");
});
