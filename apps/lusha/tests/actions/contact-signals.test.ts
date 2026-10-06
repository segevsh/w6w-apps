import { assertEquals } from "@std/assert";
import action from "../../actions/contact-signals.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-signals: POST /v3/contacts/signals", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "ids": "1,2", "signalTypes": "promotion" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/v3/contacts/signals");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "ids": ["1", "2"], "signalTypes": ["promotion"] });
  assertEquals(out, { ok: true });
});
