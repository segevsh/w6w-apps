import { assertEquals } from "@std/assert";
import action from "../../actions/contact-filter-value-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-filter-value-list: GET /v3/contacts/prospecting/filters/{filterType}", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "filterType": "locations", "query": "new y" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://api.lusha.com/v3/contacts/prospecting/filters/locations?query=new+y",
  );
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: true });
});
