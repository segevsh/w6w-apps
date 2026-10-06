import { assertEquals } from "@std/assert";
import action from "../../actions/account-get.ts";
import { envelope, mockCtx, obj, pathOf } from "../_helpers.ts";

Deno.test("account-get: GETs /account and returns plan and usage", async () => {
  const data = {
    plan: "free",
    usage: { used: 50, limit: 100, remaining: 50 },
    rateLimitPerMinute: 3,
  };
  const { ctx, calls } = mockCtx([{ body: envelope(data) }]);
  const out = await obj(await action.execute({}, ctx));
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/account");
  assertEquals(out.plan, "free");
  assertEquals(out.rateLimitPerMinute, 3);
});
