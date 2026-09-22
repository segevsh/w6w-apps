import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("user-get: reads GET /v2/users/{id}, rates and working week included", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 42, displayName: "Alex Smith", costRate: 45.5, billableRate: 95 } },
  ]);
  const result = await userGet.execute({ userId: 42 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/users/42");
  assertEquals(result.billableRate, 95);
  const output = userGet.output;
  assertEquals(
    Array.isArray(output) && output.some((o) => o.key === "billableRate"),
    true,
  );
});
