import { assertEquals } from "@std/assert";
import get from "../../actions/timeoff-request-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timeoff-request-get: GETs the request, durations only on demand", async () => {
  const { ctx, calls } = mockCtx([{ body: { requestId: 3 } }, { body: { requestId: 3 } }]);
  await get.execute({ employeeId: "11", requestId: 3 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/timeoff/employees/11/requests/3");
  assertEquals(queryOf(calls[0].url), {});
  await get.execute({ employeeId: "11", requestId: 3, includeDailyDurations: true }, ctx);
  assertEquals(queryOf(calls[1].url), { includeDailyDurations: "true" });
});
