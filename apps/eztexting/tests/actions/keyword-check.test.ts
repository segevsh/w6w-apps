import { assertEquals } from "@std/assert";
import keywordCheck from "../../actions/keyword-check.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("keyword-check: calls GET /keywords/SPRING%20SALE/check and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { keyword: "SPRING SALE", available: true } }]);
  const result = await keywordCheck.execute({ "keyword": "SPRING SALE" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/keywords/SPRING%20SALE/check`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "keyword": "SPRING SALE", "available": true });
});

Deno.test("keyword-check: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { keyword: "SPRING SALE", available: true } }]);
  await keywordCheck.execute({ "keyword": "SPRING SALE" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
