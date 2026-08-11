import { assert, assertEquals } from "@std/assert";
import quota, {
  DOCUMENTED_LIMIT_PER_SECOND,
  judgeHeadroom,
  readNumericHeader,
} from "../../health/quota.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

const JSON_HEADERS = { "content-type": "application/json" };

Deno.test("health/quota: the probe is signed and stays on the app's own host", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] }, headers: JSON_HEADERS }]);
  await quota.check!({}, ctx);
  assertEquals(quota.credential, "signed");
  // A signed check must never widen egress — the spec bans the pairing.
  assertEquals(quota.network, undefined);
  assertEquals(calls[0].url, "https://api.productboard.com/v2/entities/configurations");
  // The runtime signs it; the hook must not build a header itself.
  assertEquals(calls[0].headers["authorization"], undefined);
});

/**
 * Documented in the vendor's Rate Limits page but never observed on the wire
 * (every response reachable without a token is a gateway 401, which carries no
 * such headers). So absence must report `unknown`, and the check is
 * `informational` so that `unknown` cannot pin the app's verdict.
 */
Deno.test("health/quota: absent headers report unknown, never ok", async () => {
  const { ctx } = mockCtx([{ body: { data: [] }, headers: JSON_HEADERS }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message!.includes(String(DOCUMENTED_LIMIT_PER_SECOND)), out.message);
  assertEquals(out.quota, []);
});

Deno.test("health/quota: the check is informational so an expected unknown cannot pin the verdict", () => {
  assertEquals(quota.severity, "informational");
});

Deno.test("health/quota: present headers produce a reading and an ok verdict", async () => {
  const { ctx } = mockCtx([{
    body: { data: [] },
    headers: { ...JSON_HEADERS, "x-ratelimit-limit": "50", "x-ratelimit-remaining": "40" },
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(out.quota, [{ id: "requests", limit: 50, remaining: 40, unit: "requests" }]);
});

Deno.test("health/quota: a 429 is down and reports zero remaining with the retry delay", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    headers: { ...JSON_HEADERS, "retry-after": "2" },
    body: errorBody("rate.limitExceeded", "Rate limit exceeded", "Slow down."),
  }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(out.message!.includes("retry after 2s"), out.message);
  assertEquals(out.quota, [{ id: "requests", remaining: 0, unit: "requests" }]);
});

Deno.test("health/quota: a refused read is unknown — headroom is not the credential check's answer", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody("auth.accessDenied", "Denied", "no") }]);
  const out = await quota.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message!.includes("403"), out.message);
});

Deno.test("health/quota: judgeHeadroom bands are explicit and monotonic", () => {
  assertEquals(judgeHeadroom(50, 40).state, "ok");
  assertEquals(judgeHeadroom(50, 13).state, "ok");
  assertEquals(judgeHeadroom(50, 12).state, "degraded");
  assertEquals(judgeHeadroom(50, 5).state, "degraded");
  assertEquals(judgeHeadroom(50, 0).state, "down");
  assertEquals(judgeHeadroom(undefined, 5).state, "unknown");
  assertEquals(judgeHeadroom(50, undefined).state, "unknown");
  assertEquals(judgeHeadroom(0, 0).state, "unknown");
});

Deno.test("health/quota: readNumericHeader tolerates absence and rubbish", () => {
  const res = new Response(null, {
    headers: { "x-ratelimit-limit": "50", "x-ratelimit-remaining": "not a number", empty: "" },
  });
  assertEquals(readNumericHeader(res, "x-ratelimit-limit"), 50);
  assertEquals(readNumericHeader(res, "x-ratelimit-remaining"), undefined);
  assertEquals(readNumericHeader(res, "empty"), undefined);
  assertEquals(readNumericHeader(res, "absent"), undefined);
});
