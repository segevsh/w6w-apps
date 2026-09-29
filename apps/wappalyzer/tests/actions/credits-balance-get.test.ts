import { assertEquals } from "@std/assert";
import creditsBalanceGet from "../../actions/credits-balance-get.ts";
import { mockCtx, pathOf, withCredits } from "../_helpers.ts";

Deno.test("credits-balance-get: reads /v2/credits/balance/ and takes no params", async () => {
  const { ctx, calls } = mockCtx([withCredits({ credits: 100000 }, 0, 100000)]);
  const out = await creditsBalanceGet.execute({}, ctx) as {
    credits: number;
    creditsSpent: number;
    creditsRemaining: number;
  };

  assertEquals(pathOf(calls[0].url), "/v2/credits/balance/");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.credits, 100000);
  assertEquals(out.creditsSpent, 0);
  assertEquals(out.creditsRemaining, 100000);
  assertEquals(creditsBalanceGet.params?.length, 0);
});
