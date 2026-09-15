import { assertEquals } from "@std/assert";
import planApiCredits from "../../actions/plan-api-credits.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("plan-api-credits: reads the balance from GET /v1/plan/apiCreditsCount", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { BalanceCredits: 42 } }]);
  const out = await planApiCredits.execute({}, ctx);
  assertEquals(pathOf(calls[0]), "/v1/plan/apiCreditsCount");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { BalanceCredits: 42 });
});
