import { assertEquals } from "@std/assert";
import action from "../../actions/account-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-get: GETs /accounts/{id}, encoding an external ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "a1", name: "Acme" } } }]);
  const out = await action.execute!({ id: "ext/1" }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/accounts/ext%2F1");
  assertEquals(out, { id: "a1", name: "Acme" });
});
