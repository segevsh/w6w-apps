import { assertEquals } from "@std/assert";
import action from "../../actions/company-enrich.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-enrich: POST /v3/companies/enrich", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "ids": ["9"], "reveal": "competitors" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/companies/enrich");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "ids": ["9"], "reveal": ["competitors"] });
  assertEquals(out, { ok: true });
});
