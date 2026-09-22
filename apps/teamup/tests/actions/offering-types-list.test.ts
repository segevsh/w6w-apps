import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/offering-types-list.ts";

const sample = pageEnvelope([{ id: 1, object: "offering_type", name: "Yoga" }], 1);

Deno.test("offering-types-list: reads /offering_types and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    status: "active",
    name_contains: "yoga",
    schedule_type: "class",
    instructor: 4,
    has_active_sessions: true,
    is_age_restricted: false,
    id: 1,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/offering_types");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("name_contains"), "yoga");
  assertEquals(url.searchParams.get("schedule_type"), "class");
  assertEquals(url.searchParams.get("instructor"), "4");
  assertEquals(url.searchParams.get("has_active_sessions"), "true");
  assertEquals(url.searchParams.get("is_age_restricted"), "false");
  assertEquals(url.searchParams.get("id"), "1");
  assertEquals(result.results.length, 1);
});

Deno.test("offering-types-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
