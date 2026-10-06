import { assertEquals } from "@std/assert";
import action from "../../actions/contact-search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-search: POST /v3/contacts/search", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!(
    { "contacts": [{ "email": "a@b.co" }], "includePartialProfiles": true } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/contacts/search");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "contacts": [{ "email": "a@b.co" }],
    "options": { "includePartialProfiles": true },
  });
  assertEquals(out, { ok: true });
});
