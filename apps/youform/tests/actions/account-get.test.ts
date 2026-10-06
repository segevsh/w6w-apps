import { assertEquals, assertRejects } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GET /api/me, body verbatim, no credential header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1, email: "a@b.co" } } }]);
  const out = await accountGet.execute({}, ctx) as { data: { id: number } };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/me");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out.data.id, 1);
});

Deno.test("account-get: 401 errors carry the token hint", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const err = await assertRejects(() => Promise.resolve(accountGet.execute({}, ctx)), Error);
  assertEquals(err.message.includes("API Tokens"), true, err.message);
});
