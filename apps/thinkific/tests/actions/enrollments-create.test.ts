import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import enrollmentsCreate from "../../actions/enrollments-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("enrollments-create: POSTs course_id/user_id, omitting activatedAt creates a free trial", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { id: 1, user_id: 2, course_id: 3, is_free_trial: true } },
  ]);
  const out = await enrollmentsCreate.execute({ courseId: 3, userId: 2 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/enrollments");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { course_id: 3, user_id: 2 });
  assertEquals(out, { id: 1, user_id: 2, course_id: 3, is_free_trial: true });
});

test("enrollments-create: activatedAt/expiryDate map to activated_at/expiry_date", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await enrollmentsCreate.execute(
    {
      courseId: 3,
      userId: 2,
      activatedAt: "2026-08-15T00:00:00Z",
      expiryDate: "2027-08-15T00:00:00Z",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.activated_at, "2026-08-15T00:00:00Z");
  assertEquals(body.expiry_date, "2027-08-15T00:00:00Z");
});

test("enrollments-create: is not idempotent", () => {
  assertEquals(enrollmentsCreate.idempotent, false);
});
