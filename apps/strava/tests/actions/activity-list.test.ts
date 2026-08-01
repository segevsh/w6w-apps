import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/activity-list.ts";

Deno.test("activity-list: GETs the athlete's activities with paging + time-window params", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }] }]);
  assertEquals(
    await action.execute({ before: 200, after: 100, page: 2, perPage: 10 }, ctx),
    [{ id: 1 }],
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v3/athlete/activities");
  assertEquals(url.searchParams.get("before"), "200");
  assertEquals(url.searchParams.get("after"), "100");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "10");
});

Deno.test("activity-list: omits unset query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].url, "https://www.strava.com/api/v3/athlete/activities");
});
