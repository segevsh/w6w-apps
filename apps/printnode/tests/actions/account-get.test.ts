import { assertEquals, assertRejects } from "@std/assert";
import accountGet from "../../actions/account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("account-get: GET /whoami returns the account", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 433, email: "p@x.co", credits: 10 } }]);
  const out = await accountGet.execute({}, ctx) as { id: number };
  assertEquals(pathOf(calls[0].url), "/whoami");
  assertEquals(calls[0].method, "GET");
  assertEquals(out.id, 433);
});

Deno.test("account-get: vendor error surfaces", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "BadRequest", message: "API Key not found" },
  }]);
  await assertRejects(async () => await accountGet.execute({}, ctx), Error, "API Key not found");
});
