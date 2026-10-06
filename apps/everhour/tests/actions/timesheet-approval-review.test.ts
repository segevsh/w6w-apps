import { assertEquals, assertRejects } from "@std/assert";
import timesheetApprovalReview from "../../actions/timesheet-approval-review.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timesheet-approval-review: PUT /timesheets/{timesheetId}/approval with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timesheetApprovalReview.execute({
    "timesheetId": 148562535,
    "status": "rejected",
    "days": '{"friday": false}',
    "comment": "fix",
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/timesheets/148562535/approval");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "days": { "friday": false },
    "status": "rejected",
    "comment": "fix",
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("timesheet-approval-review: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        timesheetApprovalReview.execute({
          "timesheetId": 148562535,
          "status": "rejected",
          "days": '{"friday": false}',
          "comment": "fix",
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("timesheet-approval-review: declares perform and idempotent=true", () => {
  assertEquals(timesheetApprovalReview.type, "perform");
  assertEquals(timesheetApprovalReview.idempotent, true);
});
