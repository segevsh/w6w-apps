import { assertEquals } from "@std/assert";
import enrollmentsList from "../../actions/enrollments-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("enrollments-list: namespaces filters, including booleans, as query[key]", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await enrollmentsList.execute({ courseId: 10, completed: true, expired: false }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/enrollments");
  assertEquals(queryOf(calls[0].url), {
    "query[course_id]": "10",
    "query[completed]": "true",
    "query[expired]": "false",
  });
});
