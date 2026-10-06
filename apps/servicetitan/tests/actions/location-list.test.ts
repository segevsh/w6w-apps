import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/location-list.ts";

const conn = { display: { tenantId: "42", environment: "production" } };

Deno.test("location-list: GETs /crm/v2/tenant/{t}/locations filtered by customer", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!(
    { customerId: 9, zip: "91201", modifiedOnOrAfter: "2026-01-01T00:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://api.servicetitan.io/crm/v2/tenant/42/locations");
  assertEquals(url.searchParams.get("customerId"), "9");
  assertEquals(url.searchParams.get("zip"), "91201");
  assertEquals(url.searchParams.get("modifiedOnOrAfter"), "2026-01-01T00:00:00Z");
});
