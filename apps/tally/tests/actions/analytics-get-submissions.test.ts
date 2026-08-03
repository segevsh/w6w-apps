import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/analytics-get-submissions.ts";

Deno.test("analytics-get-submissions: GETs the completed/partial series", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { "2026-08-01": { completed: 4, partial: 1 } }, interval: 86400 } },
  ]);
  const result = await action.execute({ formId: "f1", period: "7d" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/analytics/submissions");
  assertEquals(result.data, { "2026-08-01": { completed: 4, partial: 1 } });
  assertEquals(result.interval, 86400);
});
