import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/schedule-list.ts";

Deno.test("schedule-list: fetches the first page by default", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { schedules: [{ id: "SCH1" }], more: false } },
  ]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.pagerduty.com/schedules?limit=100&offset=0");
  assertEquals(result, [{ id: "SCH1" }]);
});

Deno.test("schedule-list: returnAll paginates", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { schedules: [{ id: "SCH1" }], more: true } },
    { status: 200, body: { schedules: [{ id: "SCH2" }], more: false } },
  ]);
  const result = await action.execute!({ returnAll: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(result, [{ id: "SCH1" }, { id: "SCH2" }]);
});
