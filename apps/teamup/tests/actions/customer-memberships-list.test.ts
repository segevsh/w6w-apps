import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/customer-memberships-list.ts";

const sample = pageEnvelope([{ id: 7, object: "customermembership" }], 1);

Deno.test("customer-memberships-list: reads /customer_memberships and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    customer: 12,
    membership: 2,
    membership_type: "recurring_plan",
    status: "active",
    ids: "7",
    sort: "-start_date",
    start_date_gte: "2026-01-01T00:00:00Z",
    expiration_date_lte: "2027-01-01T00:00:00Z",
    has_expiration_date: true,
    has_active_hold: false,
    active_hold_start_date_gte: "2026-02-01T00:00:00Z",
    active_hold_end_date_lte: "2026-03-01T00:00:00Z",
    owned_or_shared_with_customer: 12,
    owned_or_shared_with_family: 3,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/customer_memberships");
  assertEquals(url.searchParams.get("customer"), "12");
  assertEquals(url.searchParams.get("membership"), "2");
  assertEquals(url.searchParams.get("membership_type"), "recurring_plan");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("ids"), "7");
  assertEquals(url.searchParams.get("sort"), "-start_date");
  assertEquals(url.searchParams.get("start_date_gte"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("expiration_date_lte"), "2027-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("has_expiration_date"), "true");
  assertEquals(url.searchParams.get("has_active_hold"), "false");
  assertEquals(url.searchParams.get("active_hold_start_date_gte"), "2026-02-01T00:00:00Z");
  assertEquals(url.searchParams.get("active_hold_end_date_lte"), "2026-03-01T00:00:00Z");
  assertEquals(url.searchParams.get("owned_or_shared_with_customer"), "12");
  assertEquals(url.searchParams.get("owned_or_shared_with_family"), "3");
  assertEquals(result.results.length, 1);
});

Deno.test("customer-memberships-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
