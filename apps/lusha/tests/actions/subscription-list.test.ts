import { assertEquals } from "@std/assert";
import action from "../../actions/subscription-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-list: GET /api/subscriptions", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "limit": 5, "offset": 10 } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lusha.com/api/subscriptions?limit=5&offset=10");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: true });
});
