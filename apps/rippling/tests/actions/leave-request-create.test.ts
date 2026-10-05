import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import leaveRequestCreate from "../../actions/leave-request-create.ts";

const BASE = {
  workerId: "w1",
  status: "PENDING",
  startDate: "2026-11-02",
  endDate: "2026-11-04",
  leaveTypeId: "lt1",
};

Deno.test("leave-request-create: POSTs /leave-requests/ with snake_case wire names", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "lr1", status: "PENDING" } }]);
  const out = await leaveRequestCreate.execute(
    { ...BASE, comments: "Family trip", startDateCustomHours: 4 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/leave-requests/");
  assertEquals(JSON.parse(calls[0].body!), {
    worker_id: "w1",
    status: "PENDING",
    start_date: "2026-11-02",
    end_date: "2026-11-04",
    leave_type_id: "lt1",
    comments: "Family trip",
    start_date_custom_hours: 4,
  });
  assertEquals(out.id, "lr1");
});

Deno.test("leave-request-create: a leave policy can stand in for the leave type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "lr1" } }]);
  const { leaveTypeId: _drop, ...rest } = BASE;
  await leaveRequestCreate.execute({ ...rest, leavePolicyId: "lp1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).leave_policy_id, "lp1");
});

Deno.test("leave-request-create: requires worker, status and both dates, and a type or policy", async () => {
  const { ctx, calls } = mockCtx([]);
  for (const key of ["workerId", "status", "startDate", "endDate"]) {
    const input: Record<string, unknown> = { ...BASE };
    delete input[key];
    await assertRejects(
      () => Promise.resolve().then(() => leaveRequestCreate.execute(input, ctx)),
      Error,
      `${key} is required`,
    );
  }
  const { leaveTypeId: _drop, ...noType } = BASE;
  await assertRejects(
    () => Promise.resolve().then(() => leaveRequestCreate.execute(noType, ctx)),
    Error,
    "leaveTypeId or leavePolicyId is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("leave-request-create: status offers exactly the four documented values", () => {
  const status = leaveRequestCreate.params!.find((p) => p.key === "status")!;
  assertEquals(
    (status.options as Array<{ value: string }>).map((o) => o.value),
    ["PENDING", "APPROVED", "REJECTED", "CANCELED"],
  );
  assertEquals(leaveRequestCreate.idempotent, false);
});
