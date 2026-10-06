import { assertEquals } from "@std/assert";
import action from "../../actions/company-signals.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-signals: POST /v3/companies/signals", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "ids": "5", "signalTypes": "surgeInHiring" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/companies/signals");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "ids": ["5"], "signalTypes": ["surgeInHiring"] });
  assertEquals(out, { ok: true });
});
