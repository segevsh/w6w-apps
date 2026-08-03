import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/analytics-get-drop-off.ts";

Deno.test("analytics-get-drop-off: GETs the drop-off funnel", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        stats: { totalVisitors: 100, formStarts: 60, formCompletes: 40, completionRate: 0.66 },
        dataAvailableSince: "2026-01-01T00:00:00.000Z",
        data: [{ blockUuid: "b1", dropOff: 5 }],
      },
    },
  ]);
  const result = await action.execute({ formId: "f1", period: "30d" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/analytics/drop-off");
  assertEquals(result.available, true);
  assertEquals(result.stats, {
    totalVisitors: 100,
    formStarts: 60,
    formCompletes: 40,
    completionRate: 0.66,
  });
  assertEquals(result.data, [{ blockUuid: "b1", dropOff: 5 }]);
  assertEquals(result.dataAvailableSince, "2026-01-01T00:00:00.000Z");
});

Deno.test("analytics-get-drop-off: a null body means no data yet, not an error", async () => {
  // The OpenAPI declares this 200 body `nullable`.
  const { ctx } = mockCtx([{ body: null }]);
  const result = await action.execute({ formId: "f1", period: "today" }, ctx);
  assertEquals(result, {
    available: false,
    stats: undefined,
    data: [],
    dataAvailableSince: undefined,
  });
});
