import { assertEquals } from "@std/assert";
import quota from "../../health/quota.ts";
import { mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (ctx: any) => quota.check!({} as any, ctx);
const headers = (remaining: string, limit = "100") => ({
  "content-type": "application/json",
  "x-ratelimit-limit": limit,
  "x-ratelimit-remaining": remaining,
});

Deno.test("quota: reads the headers off a signed GET /user", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "u" }, headers: headers("90") }]);
  const r = await run(ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/user");
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "requests", limit: 100, remaining: 90, unit: "requests" }]);
});

Deno.test("quota: under 10% is degraded, zero is down", async () => {
  assertEquals((await run(mockCtx([{ body: {}, headers: headers("5") }]).ctx)).state, "degraded");
  assertEquals((await run(mockCtx([{ body: {}, headers: headers("0") }]).ctx)).state, "down");
});

Deno.test("quota: no headers or a failing probe is unknown, never guessed", async () => {
  assertEquals((await run(mockCtx([{ body: {} }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ status: 400, body: {} }]).ctx)).state, "unknown");
});
