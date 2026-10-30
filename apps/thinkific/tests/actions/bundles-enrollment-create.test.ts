import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import bundlesEnrollmentCreate from "../../actions/bundles-enrollment-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("bundles-enrollment-create: POSTs to /bundles/{id}/enrollments and reports the raw status (201/202, no body schema)", async () => {
  const { ctx, calls } = mockCtx([{ status: 202 }]);
  const out = await bundlesEnrollmentCreate.execute({ id: "9", userId: 1 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/bundles/9/enrollments");
  assertEquals(JSON.parse(calls[0].body!), { user_id: 1 });
  assertEquals(out, { status: 202 });
});

test("bundles-enrollment-create: 201 (synchronous) is reported the same way", async () => {
  const { ctx } = mockCtx([{ status: 201 }]);
  const out = await bundlesEnrollmentCreate.execute({ id: "9", userId: 1 }, ctx);
  assertEquals(out, { status: 201 });
});

test("bundles-enrollment-create: is not idempotent", () => {
  assertEquals(bundlesEnrollmentCreate.idempotent, false);
});
