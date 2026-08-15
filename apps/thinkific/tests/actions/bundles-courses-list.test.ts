import { assertEquals } from "@std/assert";
import bundlesCoursesList from "../../actions/bundles-courses-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("bundles-courses-list: fetches GET /bundles/{id}/courses", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: 1 }]) }]);
  const out = await bundlesCoursesList.execute({ id: "9", page: 1, limit: 25 }, ctx) as {
    items: unknown[];
  };
  assertEquals(pathOf(calls[0].url), "/api/public/v1/bundles/9/courses");
  assertEquals(queryOf(calls[0].url), { page: "1", limit: "25" });
  assertEquals(out.items, [{ id: 1 }]);
});
