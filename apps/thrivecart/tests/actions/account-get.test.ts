import { assertEquals } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: calls GET /ping and returns the body verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: { account_name: "acme", account_id: "1" } }]);
  const out = await accountGet.execute({}, ctx) as { account_name: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/external/ping");
  assertEquals(out.account_name, "acme");
});

Deno.test("account-get: forwards mode as X-TC-Mode when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await accountGet.execute({ mode: "test" }, ctx);
  assertEquals(calls[0].headers["x-tc-mode"], "test");
});
