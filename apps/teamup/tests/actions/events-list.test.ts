import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/events-list.ts";

const sample = pageEnvelope([{ id: 8, object: "event" }], 1);

Deno.test("events-list: reads /events and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    venues: "1,2",
    instructors: "5",
    offering_types: "3",
    category: 4,
    ids: "8,9",
    starts_at_gte: "2026-09-22T06:00:00Z",
    start_gte: "2026-09-22T06:00:00Z",
    local_starts_at_gte: "2026-09-22T06:00:00Z",
    occupancy_status: "full",
    active_customer: true,
    applicable_to_recurring_reservation: false,
    registration_timelines: "default",
    sort: "starts_at",
    page: 3,
    page_size: 50,
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/events");
  assertEquals(url.searchParams.get("venues"), "1,2");
  assertEquals(url.searchParams.get("instructors"), "5");
  assertEquals(url.searchParams.get("offering_types"), "3");
  assertEquals(url.searchParams.get("category"), "4");
  assertEquals(url.searchParams.get("ids"), "8,9");
  assertEquals(url.searchParams.get("starts_at_gte"), "2026-09-22T06:00:00Z");
  assertEquals(url.searchParams.get("start_gte"), "2026-09-22T06:00:00Z");
  assertEquals(url.searchParams.get("local_starts_at_gte"), "2026-09-22T06:00:00Z");
  assertEquals(url.searchParams.get("occupancy_status"), "full");
  assertEquals(url.searchParams.get("active_customer"), "true");
  assertEquals(url.searchParams.get("applicable_to_recurring_reservation"), "false");
  assertEquals(url.searchParams.get("registration_timelines"), "default");
  assertEquals(url.searchParams.get("sort"), "starts_at");
  assertEquals(url.searchParams.get("page"), "3");
  assertEquals(url.searchParams.get("page_size"), "50");
  assertEquals(result.results.length, 1);
});

Deno.test("events-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
