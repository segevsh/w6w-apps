import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

const input = {} as never;

Deno.test("quota: ok with the remaining credits", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: { credits: 4825 } } }]);
  const r = await quota.check!(input, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "credits", remaining: 4825, unit: "credits" }]);
});

Deno.test("quota: zero credits is down", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: { credits: 0 } } }]);
  assertEquals((await quota.check!(input, ctx)).state, "down");
});

Deno.test("quota: an error or a non-number is unknown", async () => {
  const a = mockCtx([{
    status: 403,
    body: { success: false, error: { code: "INVALID_API_KEY" } },
  }]);
  assertEquals((await quota.check!(input, a.ctx)).state, "unknown");
  const b = mockCtx([{ body: { success: true, data: {} } }]);
  assertEquals((await quota.check!(input, b.ctx)).state, "unknown");
});
