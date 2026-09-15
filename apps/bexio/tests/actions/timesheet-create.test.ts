import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/timesheet-create.ts";

Deno.test("timesheet-create: POSTs to /2.0/timesheet with a duration-shaped tracking object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1, duration: "01:40" } }]);
  const tracking = { type: "duration", date: "2026-09-15", duration: "01:40" };
  const result = await action.execute!({
    userId: 1,
    clientServiceId: 1,
    allowableBill: true,
    tracking,
  }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/timesheet");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user_id, 1);
  assertEquals(body.client_service_id, 1);
  assertEquals(body.allowable_bill, true);
  assertEquals(body.tracking, tracking);
  assertEquals(result, { id: 1, duration: "01:40" });
});

Deno.test("timesheet-create: also accepts a range-shaped tracking object verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 2 } }]);
  const tracking = { type: "range", start: "2026-09-15 09:00:00", end: "2026-09-15 10:40:00" };
  await action.execute!({ userId: 1, clientServiceId: 1, allowableBill: false, tracking }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tracking, tracking);
});
