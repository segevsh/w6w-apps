import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/staff-list.ts";

const sample = pageEnvelope([{ id: 11, name: "Ada" }], 1);

Deno.test("staff-list: reads /staff and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    has_any_permissions: "manage_memberships,manage_events",
    page: 1,
    page_size: 100,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/staff");
  assertEquals(url.searchParams.get("has_any_permissions"), "manage_memberships,manage_events");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(result.results.length, 1);
});

Deno.test("staff-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
