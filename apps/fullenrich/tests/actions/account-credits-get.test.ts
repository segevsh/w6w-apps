import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/account-credits-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-credits-get: GETs the balance", async () => {
  const { ctx, calls } = mockCtx([{ body: { balance: 5000 } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://app.fullenrich.com/api/v2/account/credits");
  assertEquals(calls[0].method, "GET");
  assert(!("authorization" in calls[0].headers));
  assertEquals(out, { balance: 5000 });
});

Deno.test("account-credits-get: a missing balance is null, not zero", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await action.execute!({}, ctx), { balance: null });
});

Deno.test("account-credits-get: a 401 is thrown", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "error.api.key", message: "Unknown api key" },
  }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "Unknown api key");
});
