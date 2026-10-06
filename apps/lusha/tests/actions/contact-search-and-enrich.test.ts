import { assertEquals } from "@std/assert";
import action from "../../actions/contact-search-and-enrich.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-search-and-enrich: POST /v3/contacts/search-and-enrich", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!(
    { "contacts": '[{"email":"a@b.co"}]', "reveal": ["phones"] } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/contacts/search-and-enrich");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "contacts": [{ "email": "a@b.co" }],
    "reveal": ["phones"],
  });
  assertEquals(out, { ok: true });
});
