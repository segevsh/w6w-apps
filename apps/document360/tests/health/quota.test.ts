import { assertEquals } from "@std/assert";
import quota, { readHeaders, WARN_FRACTION } from "../../health/quota.ts";
import { CA, listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const hdr = (limit: string | number, remaining: string | number) => ({
  "content-type": "application/json",
  "x-ratelimit-limit": String(limit),
  "x-ratelimit-remaining": String(remaining),
});
const run = (ctx: Parameters<NonNullable<typeof quota.check>>[1]) => quota.check!({}, ctx);

Deno.test("quota: reports the read bucket from the headers", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]), headers: hdr(120, 100) }], {
    region: "ca",
  });
  const r = await run(ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.quota, [{ id: "read-per-minute", limit: 120, remaining: 100, unit: "requests" }]);
  assertEquals(calls[0].url.startsWith(CA), true);
  assertEquals(pathOf(calls[0].url), "/v3/projects");
  assertEquals(queryOf(calls[0].url), { page_size: "1" });
});

Deno.test("quota: degraded at the warn fraction, down at zero", async () => {
  assertEquals(WARN_FRACTION, 0.9);
  const warn = await run(mockCtx([{ body: listEnvelope([]), headers: hdr(100, 10) }]).ctx);
  assertEquals(warn.state, "degraded");
  const empty = await run(mockCtx([{ body: listEnvelope([]), headers: hdr(100, 0) }]).ctx);
  assertEquals(empty.state, "down");
});

Deno.test("quota: a 429 is down and carries the retry hint", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "", headers: { "retry-after": "30" } }]);
  const r = await run(ctx);
  assertEquals(r.state, "down");
  assertEquals(r.message?.includes("30s"), true);
});

Deno.test("quota: missing headers and non-2xx are unknown, never ok", async () => {
  assertEquals((await run(mockCtx([{ body: listEnvelope([]) }]).ctx)).state, "unknown");
  assertEquals((await run(mockCtx([{ status: 403, body: "" }]).ctx)).state, "unknown");
});

Deno.test("quota: readHeaders ignores blank and non-numeric values", () => {
  assertEquals(
    readHeaders(new Headers({ "x-ratelimit-limit": " ", "x-ratelimit-remaining": "x" })),
    {
      limit: undefined,
      remaining: undefined,
    },
  );
});

Deno.test("quota: a signed, connection-scoped quota check", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
});
