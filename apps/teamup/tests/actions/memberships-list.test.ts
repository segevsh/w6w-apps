import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/memberships-list.ts";

const sample = pageEnvelope([{ id: 2, object: "membership" }], 1);

Deno.test("memberships-list: reads /memberships and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    categories: "1,2",
    offering_type: 3,
    is_dropin: false,
    for_sale: true,
    visible_to_customers: true,
    allow_repeat_purchases: false,
    permits_registration_for_event: 8,
    name_contains: "yoga",
    forms: "4",
    waivers: "5",
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/memberships");
  assertEquals(url.searchParams.get("categories"), "1,2");
  assertEquals(url.searchParams.get("offering_type"), "3");
  assertEquals(url.searchParams.get("is_dropin"), "false");
  assertEquals(url.searchParams.get("for_sale"), "true");
  assertEquals(url.searchParams.get("visible_to_customers"), "true");
  assertEquals(url.searchParams.get("allow_repeat_purchases"), "false");
  assertEquals(url.searchParams.get("permits_registration_for_event"), "8");
  assertEquals(url.searchParams.get("name_contains"), "yoga");
  assertEquals(url.searchParams.get("forms"), "4");
  assertEquals(url.searchParams.get("waivers"), "5");
  assertEquals(result.results.length, 1);
});

Deno.test("memberships-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
