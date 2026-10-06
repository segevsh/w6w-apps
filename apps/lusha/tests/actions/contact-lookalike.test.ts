import { assertEquals } from "@std/assert";
import action from "../../actions/contact-lookalike.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-lookalike: POST /v3/contacts/lookalike", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "seeds": { "ids": ["1"] }, "limit": 10 } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/contacts/lookalike");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "seeds": { "ids": ["1"] }, "limit": 10 });
  assertEquals(out, { ok: true });
});
