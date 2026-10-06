import { assertEquals, assertRejects } from "@std/assert";
import account from "../../actions/account-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-get: GETs /me and returns the plan and credits", async () => {
  const body = { organizationId: "o1", plan: "pro", maxCredits: 1000, usedCredits: 12 };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await account.execute({}, ctx), body);
  assertEquals(calls[0].url, "https://api.supadata.ai/v1/me");
  assertEquals(calls[0].method, "GET");
});

Deno.test("account-get: a rejected key is thrown with the reconnect hint", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "unauthorized", message: "Unauthorized", details: "Missing API Key" },
  }]);
  await assertRejects(
    async () => await account.execute({}, ctx),
    Error,
    "reconnect this connection",
  );
});
