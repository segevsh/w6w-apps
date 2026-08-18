import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import credentials from "../../health/credentials.ts";

const conn = { display: { environment: "sandbox" } };

const page = (over: Record<string, string> = {}) => ({
  components: [
    "API",
    "Link",
    "Dashboard",
    "Some Institution Group",
  ].map((name) => ({ name, status: over[name] ?? "operational", group: false })),
});

Deno.test("service: all green reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page() }], conn);
  assertEquals((await service.check!({}, ctx)).state, "ok");
  assertEquals(new URL(calls[0].url).host, "status.plaid.com");
});

Deno.test("service: an API outage is down", async () => {
  const { ctx } = mockCtx([{ status: 200, body: page({ API: "major_outage" }) }], conn);
  assertEquals((await service.check!({}, ctx)).state, "down");
});

Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }], conn);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

/** An Item-free probe can only fail for connection reasons. */
Deno.test("credentials: probes an endpoint that needs no Item", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { institutions: [] } }], conn);
  const out = await credentials.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(new URL(calls[0].url).pathname, "/institutions/get");
  // No access token anywhere in the request.
  assert(!calls[0].body!.includes("access_token"), calls[0].body!);
});

/** The commonest setup mistake gets its own message. */
Deno.test("credentials: a wrong-environment secret is down, and named", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { error_code: "INVALID_API_KEYS" } }], conn);
  const out = await credentials.check!({}, ctx);
  assertEquals(out.state, "down");
  assert(/differs per environment/.test(out.message!), out.message);
});

Deno.test("credentials: rate limiting is degraded, and says there is no headroom", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error_code: "RATE_LIMIT_EXCEEDED" } }], conn);
  const out = await credentials.check!({}, ctx);
  assertEquals(out.state, "degraded");
  assert(/no headroom/.test(out.message!), out.message);
});

Deno.test("credentials: is a connection-scoped signed dependency check", () => {
  assertEquals(credentials.kind, "dependency");
  assertEquals(credentials.scope, "connection");
  assertEquals(credentials.credential, "signed");
});
