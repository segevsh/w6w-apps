import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-statistics-timeline.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-statistics-timeline: returns the daily array", async () => {
  const days = [{
    date: "2026-06-28",
    summary: { aggregate: { delivered: 50 }, country_data: {} },
  }];
  const { ctx, calls } = mockCtx([{ body: { data: days } }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/statistics/timeline");
  assertEquals(out.days, days);
});

Deno.test("get-statistics-timeline: a non-array payload becomes an empty list; errors throw", async () => {
  assertEquals((await run(action, {}, mockCtx([{ body: { data: null } }]).ctx)).days, []);
  await assertRejects(
    () => run(action, {}, mockCtx([{ status: 401, body: { error: { message: "bad key" } } }]).ctx),
    Error,
    "bad key",
  );
});
