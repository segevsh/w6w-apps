import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/leave-of-absence-list.ts";

const D = { display: { host: "wd2-impl-services1.workday.com", tenant: "acme_impl1" } };

Deno.test("leave-of-absence-list: calls the documented URL and returns a page", async () => {
  const { ctx, calls } = mockCtx(
    [{ body: { total: 1, data: [{ id: "x1", descriptor: "One" }] } }],
    D,
  );
  const result = await action.execute({
    "workerId": "a3f1c2d4e5b6478990a1b2c3d4e5f607",
    "leaveType": "l1",
    "status": "x",
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://wd2-impl-services1.workday.com/ccx/api/absenceManagement/v5/acme_impl1/workers/a3f1c2d4e5b6478990a1b2c3d4e5f607/leavesOfAbsence?status=x&leaveType=l1",
  );
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(result.items, [{ id: "x1", descriptor: "One" }]);
  assertEquals(result.total, 1);
  assertEquals(result.count, 1);
  assertEquals(result.hasMore, false);
});

Deno.test("leave-of-absence-list: surfaces a Workday error body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "Access denied" } }], D);
  await assertRejects(
    async () =>
      await action.execute({
        "workerId": "a3f1c2d4e5b6478990a1b2c3d4e5f607",
        "leaveType": "l1",
        "status": "x",
      }, ctx),
    Error,
    "Access denied",
  );
});
