import { assertEquals } from "@std/assert";
import action from "../../actions/subscription-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("subscription-delete: POST /api/subscriptions/delete", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const out = await action.execute!({ "ids": "a,b" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.lusha.com/api/subscriptions/delete");
  assertEquals(
    calls[0].headers["api_key"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals(JSON.parse(calls[0].body!), { "ids": ["a", "b"] });
  assertEquals(out, { ok: true });
});
