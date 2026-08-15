import { assertEquals } from "@std/assert";
import bundlesGet from "../../actions/bundles-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("bundles-get: fetches GET /bundles/{id}", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 1, name: "A Bundle", course_ids: [1, 2] },
  }]);
  const out = await bundlesGet.execute({ id: "1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/public/v1/bundles/1");
  assertEquals(out, { id: 1, name: "A Bundle", course_ids: [1, 2] });
});
