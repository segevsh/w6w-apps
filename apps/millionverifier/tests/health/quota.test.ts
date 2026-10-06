import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("quota: ok with credits, down at zero, reports the figure", async () => {
  const ok = mockCtx([{ body: { credits: 40 } }]);
  const r = await quota.check!({}, ok.ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "credits", remaining: 40, unit: "credits" }]);
  assertEquals(quota.credential, "signed");
  const zero = mockCtx([{ body: { credits: 0 } }]);
  assertEquals((await quota.check!({}, zero.ctx)).state, "down");
});

Deno.test("quota: an error body or non-2xx is unknown, never a credit verdict", async () => {
  const err = mockCtx([{ body: { result: "error", error: "apikey_not_found" } }]);
  const r = await quota.check!({}, err.ctx);
  assertEquals(r.state, "unknown");
  const bad = mockCtx([{ status: 500, body: "x" }]);
  assertEquals((await quota.check!({}, bad.ctx)).state, "unknown");
});
