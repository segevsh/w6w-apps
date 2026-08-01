import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/schedule-get.ts";

Deno.test("schedule-get: fetches by id and unwraps `.schedule`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { schedule: { id: "SCH1" } } }]);
  const result = await action.execute!({ scheduleId: "SCH1" }, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/schedules/SCH1");
  assertEquals(result, { id: "SCH1" });
});

Deno.test("schedule-get: since/until are passed through as query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { schedule: {} } }]);
  await action.execute!(
    { scheduleId: "SCH1", since: "2026-01-01T00:00:00Z", until: "2026-01-08T00:00:00Z" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("since"), "2026-01-01T00:00:00Z");
  assertEquals(url.searchParams.get("until"), "2026-01-08T00:00:00Z");
});

Deno.test("schedule-get: missing scheduleId rejects", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await action.execute!({ scheduleId: "" }, ctx),
    Error,
    "scheduleId",
  );
});
