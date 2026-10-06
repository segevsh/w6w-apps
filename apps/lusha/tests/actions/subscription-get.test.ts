import { assertEquals } from "@std/assert";
import action from "../../actions/subscription-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-get: GET /api/subscriptions/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "id": "abc" } as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.lusha.com/api/subscriptions/abc");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(calls[0].body, null);
  assertEquals(out, { ok: true });
});
