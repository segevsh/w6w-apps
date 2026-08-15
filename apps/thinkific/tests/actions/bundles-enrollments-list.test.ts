import { assertEquals } from "@std/assert";
import bundlesEnrollmentsList from "../../actions/bundles-enrollments-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("bundles-enrollments-list: fetches GET /bundles/{id}/enrollments", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await bundlesEnrollmentsList.execute({ id: "9", userId: 1, page: 1, limit: 25 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/bundles/9/enrollments");
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "25", "query[user_id]": "1" });
});

Deno.test("bundles-enrollments-list: completed/expired are exposed as booleans, matching the description over the schema typo", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([]) }]);
  await bundlesEnrollmentsList.execute({ id: "9", completed: true, expired: false }, ctx);
  assertEquals(queryOf(calls[0].url)["query[completed]"], "true");
  assertEquals(queryOf(calls[0].url)["query[expired]"], "false");
  const completedParam = bundlesEnrollmentsList.params!.find((p) => p.key === "completed")!;
  assertEquals(completedParam.type, "boolean");
});
