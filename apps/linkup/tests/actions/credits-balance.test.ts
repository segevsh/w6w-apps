import { assertEquals, assertRejects } from "@std/assert";
import creditsBalance from "../../actions/credits-balance.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("credits-balance: GET /v1/credits/balance", async () => {
  const { ctx, calls } = mockCtx([{ body: { balance: 123.456 } }]);
  assertEquals(await creditsBalance.execute({}, ctx), { balance: 123.456 });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.linkup.so/v1/credits/balance");
});

Deno.test("credits-balance: a 401 is an error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { code: "UNAUTHORIZED" } } }]);
  await assertRejects(async () => await creditsBalance.execute({}, ctx), Error, "Linkup 401");
});
