import { assertEquals } from "@std/assert";
import bundlesEnrollmentUpdate from "../../actions/bundles-enrollment-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bundles-enrollment-update: PUTs to /bundles/{id}/enrollments with user_id in the body, not the path", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await bundlesEnrollmentUpdate.execute(
    { id: "9", userId: 1, expiryDate: "2027-01-01T00:00:00Z" },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/bundles/9/enrollments");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.user_id, 1);
  assertEquals(body.expiry_date, "2027-01-01T00:00:00Z");
  assertEquals(out, { status: 204 });
});

Deno.test("bundles-enrollment-update: is idempotent", () => {
  assertEquals(bundlesEnrollmentUpdate.idempotent, true);
});
