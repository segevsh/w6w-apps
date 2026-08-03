import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import quota, { parseRateLimit } from "../../health/quota.ts";

Deno.test("quota: declares a signed, informational check with no extra egress", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.severity, "informational");
  // A signed check must not widen egress — the spec forbids the combination.
  assertEquals(quota.network, undefined);
  assert(typeof quota.check === "function");
});

Deno.test("parseRateLimit: parses the COMMA form Close documents", () => {
  assertEquals(parseRateLimit("limit=100, remaining=50, reset=5"), {
    limit: 100,
    remaining: 50,
    reset: 5,
  });
});

Deno.test("parseRateLimit: parses the SEMICOLON form the live API actually returns", () => {
  // Verified on the wire 2026-08-03: `ratelimit: limit=100; remaining=100; reset=1`.
  // Accepting only the documented comma would yield no readings against the real server.
  assertEquals(parseRateLimit("limit=100; remaining=100; reset=1"), {
    limit: 100,
    remaining: 100,
    reset: 1,
  });
});

Deno.test("parseRateLimit: keeps a fractional reset, which Close documents as a decimal", () => {
  assertEquals(parseRateLimit("limit=100; remaining=3; reset=0.5").reset, 0.5);
});

Deno.test("parseRateLimit: ignores unknown keys and junk rather than failing", () => {
  assertEquals(parseRateLimit("limit=10; future=7; garbage; =3; remaining=x"), {
    limit: 10,
    future: 7,
  });
  assertEquals(parseRateLimit(null), {});
  assertEquals(parseRateLimit(""), {});
});

Deno.test("quota: probes GET /me/ and reports headroom from the combined header", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: "user_1" },
    headers: { "content-type": "application/json", ratelimit: "limit=100; remaining=80; reset=5" },
  }]);
  const report = await quota.check!({}, ctx);

  assertEquals(calls[0].url, "https://api.close.com/api/v1/me/");
  assertEquals(report.state, "ok");
  const bucket = report.quota![0];
  assertEquals(bucket.limit, 100);
  assertEquals(bucket.remaining, 80);
  assertEquals(bucket.unit, "requests");
  // Named for what it measures: Close meters per endpoint group, not globally.
  assertEquals(bucket.id, "endpoint-group");
  assert(typeof bucket.resetAt === "string");
});

Deno.test("quota: falls back to the discrete ratelimit-* headers", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: {
      "content-type": "application/json",
      "ratelimit-limit": "60",
      "ratelimit-remaining": "59",
      "ratelimit-reset": "1",
    },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(report.quota![0].limit, 60);
  assertEquals(report.quota![0].remaining, 59);
});

Deno.test("quota: reports degraded under 10% headroom and down at zero", async () => {
  const cases: Array<[string, string]> = [
    ["limit=100; remaining=5; reset=1", "degraded"],
    ["limit=100; remaining=0; reset=1", "down"],
    ["limit=100; remaining=50; reset=1", "ok"],
  ];
  for (const [header, expected] of cases) {
    const { ctx } = mockCtx([{
      status: 200,
      body: {},
      headers: { "content-type": "application/json", ratelimit: header },
    }]);
    const report = await quota.check!({}, ctx);
    assertEquals(report.state, expected, header);
  }
});

Deno.test("quota: reports unknown when no rate-limit header is readable", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {},
    headers: { "content-type": "application/json" },
  }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("RateLimit"));
});

Deno.test("quota: a failed probe reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert((report.message ?? "").includes("500"));
});
