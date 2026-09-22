import { assertEquals } from "@std/assert";
import branchGet from "../../actions/branch-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("branch-get: reads GET /v2/branches/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 7, name: "Auckland" } }]);
  const result = await branchGet.execute({ branchId: 7 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/branches/7");
  assertEquals(result, { id: 7, name: "Auckland" });
});

Deno.test("branch-get: the path id is validated as an integer before it is used", () => {
  assertEquals(branchGet.params?.[0].key, "branchId");
  assertEquals(branchGet.params?.[0].required, true);
  assertEquals(branchGet.params?.[0].validation, { integer: true, min: 1 });
});
