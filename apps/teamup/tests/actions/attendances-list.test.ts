import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/attendances-list.ts";

const sample = pageEnvelope([{ id: 1, object: "attendance" }], 1);

Deno.test("attendances-list: reads /attendances and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    customer: 12,
    event: 8,
    venue: 3,
    status: "attended",
    offering_types: "1,2",
    sort: "-created_at",
    event_starts_at_gte: "2026-09-01T00:00:00Z",
    event_local_starts_at_lte: "2026-09-30T00:00:00Z",
    event_applicable_to_recurring_reservation: true,
    page: 1,
    page_size: 100,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/attendances");
  assertEquals(url.searchParams.get("customer"), "12");
  assertEquals(url.searchParams.get("event"), "8");
  assertEquals(url.searchParams.get("venue"), "3");
  assertEquals(url.searchParams.get("status"), "attended");
  assertEquals(url.searchParams.get("offering_types"), "1,2");
  assertEquals(url.searchParams.get("sort"), "-created_at");
  assertEquals(url.searchParams.get("event_starts_at_gte"), "2026-09-01T00:00:00Z");
  assertEquals(url.searchParams.get("event_local_starts_at_lte"), "2026-09-30T00:00:00Z");
  assertEquals(url.searchParams.get("event_applicable_to_recurring_reservation"), "true");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(result.results.length, 1);
});

Deno.test("attendances-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
