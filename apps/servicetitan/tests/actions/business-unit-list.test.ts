import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/business-unit-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("business-unit-list: GETs /settings/v2/tenant/{t}/business-units", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ name: "HVAC", pageSize: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(
    url.origin + url.pathname,
    "https://api.servicetitan.io/settings/v2/tenant/42/business-units",
  );
  assertEquals(url.searchParams.get("name"), "HVAC");
  assertEquals(url.searchParams.get("pageSize"), "5");
});
