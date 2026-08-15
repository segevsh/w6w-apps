import { assertEquals } from "@std/assert";
import enrollmentsUpdate from "../../actions/enrollments-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("enrollments-update: PUTs to /enrollments/{id} and returns the 204 status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await enrollmentsUpdate.execute({ id: "5", expiryDate: "2027-01-01T00:00:00Z" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/enrollments/5");
  assertEquals(JSON.parse(calls[0].body!).expiry_date, "2027-01-01T00:00:00Z");
  assertEquals(out, { status: 204 });
});
