import { assertEquals } from "@std/assert";
import action from "../../actions/contact-prospect.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-prospect: POST /v3/contacts/prospecting", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!(
    {
      "filters": { "contacts": { "include": { "jobTitles": ["CTO"] } } },
      "page": 2,
      "excludeDnc": true,
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/contacts/prospecting");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "pagination": { "page": 2, "size": 25 },
    "filters": { "contacts": { "include": { "jobTitles": ["CTO"] } } },
    "options": { "excludeDnc": true },
  });
  assertEquals(out, { ok: true });
});
