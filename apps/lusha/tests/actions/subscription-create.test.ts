import { assertEquals } from "@std/assert";
import action from "../../actions/subscription-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-create: POST /api/subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!(
    {
      "url": "https://x.io/h",
      "entityType": "contact",
      "signalTypes": "promotion",
      "entityIds": "1,2",
      "name": "n",
    } as never,
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/api/subscriptions");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    "defaults": { "url": "https://x.io/h", "entityType": "contact", "signalTypes": ["promotion"] },
    "subscriptions": [{ "entityId": "1" }, { "entityId": "2" }],
    "name": "n",
  });
  assertEquals(out, { ok: true });
});
