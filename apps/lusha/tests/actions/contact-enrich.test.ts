import { assertEquals } from "@std/assert";
import action from "../../actions/contact-enrich.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-enrich: POST /v3/contacts/enrich", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "ids": "c1, c2", "reveal": "emails" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/contacts/enrich");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "ids": ["c1", "c2"], "reveal": ["emails"] });
  assertEquals(out, { ok: true });
});
