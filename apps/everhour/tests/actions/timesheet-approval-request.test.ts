import { assertEquals, assertRejects } from "@std/assert";
import timesheetApprovalRequest from "../../actions/timesheet-approval-request.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("timesheet-approval-request: POST /timesheets/{timesheetId}/approval with the documented query and body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { "id": 1, "name": "x" } }]);
  const out = await timesheetApprovalRequest.execute({
    "timesheetId": 148562535,
    "comment": "please",
    "reviewer": 14854,
  }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/timesheets/148562535/approval");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "comment": "please",
    "reviewer": 14854,
  });
  assertEquals(calls[0].headers["x-accept-version"], "1.2");
  assertEquals(
    calls[0].headers["x-api-key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(out, { "id": 1, "name": "x" });
});

Deno.test("timesheet-approval-request: an Everhour error surfaces its message and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody(404, "Not found") }]);
  const err = await assertRejects(
    () =>
      Promise.resolve(
        timesheetApprovalRequest.execute({
          "timesheetId": 148562535,
          "comment": "please",
          "reviewer": 14854,
        }, ctx),
      ),
    Error,
  );
  assertEquals(err.message.includes("404"), true, err.message);
  assertEquals(err.message.includes("Not found"), true, err.message);
});

Deno.test("timesheet-approval-request: declares perform and idempotent=false", () => {
  assertEquals(timesheetApprovalRequest.type, "perform");
  assertEquals(timesheetApprovalRequest.idempotent, false);
});
