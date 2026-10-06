import { assertEquals } from "@std/assert";
import action from "../../actions/company-prospect.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-prospect: POST /v3/companies/prospecting", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!(
    { "filters": { "companies": { "include": { "names": ["Acme"] } } } } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/companies/prospecting");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "pagination": { "page": 0, "size": 25 },
    "filters": { "companies": { "include": { "names": ["Acme"] } } },
  });
  assertEquals(out, { ok: true });
});
