import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import action from "../../actions/timesheet-end.ts";
import { BASE_URL, mockCtx } from "../_helpers.ts";

test("timesheet-end: POSTs intTimesheetId/intMealbreakMinute to /supervise/timesheet/end", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { Id: 3 } }],
    { display: { baseUrl: BASE_URL } },
  );
  const out = await action.execute({ intTimesheetId: 3, intMealbreakMinute: 30 }, ctx);
  assertEquals(calls[0].url, `${BASE_URL}/api/v1/supervise/timesheet/end`);
  assertEquals(JSON.parse(calls[0].body!), { intTimesheetId: 3, intMealbreakMinute: 30 });
  assertEquals(out, { response: { Id: 3 } });
});

test("timesheet-end: defaults the meal break to 0 when omitted, matching Deputy's own example", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { Id: 3 } }], {
    display: { baseUrl: BASE_URL },
  });
  await action.execute({ intTimesheetId: 3 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { intTimesheetId: 3, intMealbreakMinute: 0 });
});

test("timesheet-end: is idempotent — one timesheet id, same end state on replay", () => {
  assertEquals(action.idempotent, true);
});
