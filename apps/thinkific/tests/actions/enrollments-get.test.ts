import { assertEquals } from "@std/assert";
import enrollmentsGet from "../../actions/enrollments-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("enrollments-get: fetches GET /enrollments/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 5, user_id: 1, course_id: 2 } }]);
  const out = await enrollmentsGet.execute({ id: "5" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/enrollments/5");
  assertEquals(out, { id: 5, user_id: 1, course_id: 2 });
});
