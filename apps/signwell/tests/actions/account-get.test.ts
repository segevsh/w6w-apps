import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/account-get.ts";

Deno.test("account-get: GETs /me and returns the body", async () => {
  const body = {
    id: "m1",
    role: "owner",
    user: { id: "u", name: "A", email: "a@b.test" },
    account: { id: "a", name: "Acme", plan_tier: "business" },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
  assertEquals(calls[0].url, "https://www.signwell.com/api/v1/me");
  assertEquals(calls[0].method, "GET");
});

Deno.test("account-get: a 401 is read from the vendor error code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      message: "Missing or invalid authorization key",
      meta: { error: "api_key_unauthorized_error" },
    },
  }]);
  const err = await assertRejects(async () => await action.execute!({}, ctx));
  assert((err as Error).message.includes("api_key_unauthorized_error"));
});
