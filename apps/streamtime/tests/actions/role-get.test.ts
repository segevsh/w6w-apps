import { assertEquals } from "@std/assert";
import roleGet from "../../actions/role-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("role-get: reads GET /v2/roles/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 4, name: "Art Director", active: true } }]);
  const result = await roleGet.execute({ roleId: 4 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/roles/4");
  assertEquals(result.name, "Art Director");
});
