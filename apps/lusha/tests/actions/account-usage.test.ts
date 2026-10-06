import { assertEquals } from "@std/assert";
import action from "../../actions/account-usage.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-usage: GET /v3/account/usage", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({} as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/account/usage");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: true });
});
