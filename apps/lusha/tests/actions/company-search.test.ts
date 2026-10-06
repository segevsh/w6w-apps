import { assertEquals } from "@std/assert";
import action from "../../actions/company-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-search: POST /v3/companies/search", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "companies": [{ "domain": "x.com" }] } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/companies/search");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "companies": [{ "domain": "x.com" }] });
  assertEquals(out, { ok: true });
});
