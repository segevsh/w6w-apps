import { assertEquals } from "@std/assert";
import { mockCtx, pageEnvelope } from "../_helpers.ts";
import action from "../../actions/course-sessions-list.ts";

const sample = pageEnvelope([{ id: 6, object: "course_session" }], 1);

Deno.test("course-sessions-list: reads /course_sessions and passes its filters through", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({
    course: 5,
    venues: "3",
    instructors: "4",
    offering_types: "1,2",
    occupancy_status: "full",
    sort: "starts_at",
    status: "active",
    starts_at_gte: "2026-09-22T06:00:00Z",
    start_lte: "2026-09-29T06:00:00Z",
    local_starts_at_gte: "2026-09-22T06:00:00Z",
  }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/course_sessions");
  assertEquals(url.searchParams.get("course"), "5");
  assertEquals(url.searchParams.get("venues"), "3");
  assertEquals(url.searchParams.get("instructors"), "4");
  assertEquals(url.searchParams.get("offering_types"), "1,2");
  assertEquals(url.searchParams.get("occupancy_status"), "full");
  assertEquals(url.searchParams.get("sort"), "starts_at");
  assertEquals(url.searchParams.get("status"), "active");
  assertEquals(url.searchParams.get("starts_at_gte"), "2026-09-22T06:00:00Z");
  assertEquals(url.searchParams.get("start_lte"), "2026-09-29T06:00:00Z");
  assertEquals(url.searchParams.get("local_starts_at_gte"), "2026-09-22T06:00:00Z");
  assertEquals(result.results.length, 1);
});

Deno.test("course-sessions-list: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});
