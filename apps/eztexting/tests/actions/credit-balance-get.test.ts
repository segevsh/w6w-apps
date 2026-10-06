import { assertEquals } from "@std/assert";
import creditBalanceGet from "../../actions/credit-balance-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("credit-balance-get: calls GET /credits and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{
    body: { planCredits: 100, anytimeCredits: 5, totalCredits: 105 },
  }]);
  const result = await creditBalanceGet.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/credits`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "planCredits": 100, "anytimeCredits": 5, "totalCredits": 105 });
});

Deno.test("credit-balance-get: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{
    body: { planCredits: 100, anytimeCredits: 5, totalCredits: 105 },
  }]);
  await creditBalanceGet.execute({} as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
