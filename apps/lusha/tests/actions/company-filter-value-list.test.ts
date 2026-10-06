import { assertEquals } from "@std/assert";
import action from "../../actions/company-filter-value-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-filter-value-list: GET /v3/companies/prospecting/filters/{filterType}", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "filterType": "sizes" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/companies/prospecting/filters/sizes");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: true });
});
