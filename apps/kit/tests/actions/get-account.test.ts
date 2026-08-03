import { assertEquals } from "@std/assert";
import action from "../../actions/get-account.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-account: GETs /v4/account with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { user: {}, account: { id: 1 } } }]);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/account");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
});

Deno.test("get-account: returns the account envelope verbatim", async () => {
  const body = { user: { email: "ada@example.com" }, account: { id: 42, name: "Ada" } };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
