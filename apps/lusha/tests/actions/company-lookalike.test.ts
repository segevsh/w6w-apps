import { assertEquals } from "@std/assert";
import action from "../../actions/company-lookalike.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-lookalike: POST /v3/companies/lookalike", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "seeds": { "domains": ["a.com"] } } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/companies/lookalike");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "seeds": { "domains": ["a.com"] } });
  assertEquals(out, { ok: true });
});
