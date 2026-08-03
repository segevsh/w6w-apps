import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";

const JSON_HEADERS = { "content-type": "application/json" };

Deno.test("service: the healthy answer is a 401 carrying TickTick's JSON error envelope", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    headers: JSON_HEADERS,
    body: { error: "unauthorized", error_description: "Full authentication is required" },
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, "https://api.ticktick.com/open/v1/project");
  // Unsigned, by construction: the probe works *because* it sends no credential.
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("service: a 5xx is the one answer that means down", async () => {
  for (const status of [500, 502, 503]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const out = await service.check!({}, ctx);
    assertEquals(out.state, "down", `${status} should be down`);
  }
});

Deno.test("service: a 401 with an HTML body is an edge device, not the API — unknown", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/html" },
    body: "<html>Unauthorized</html>",
  }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("text/html"));
});

Deno.test("service: a 401 whose JSON is not the error envelope is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ status: 401, headers: JSON_HEADERS, body: { something: "else" } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: an unauthenticated 200 is a surprise, not health", async () => {
  const { ctx } = mockCtx([{ status: 200, headers: JSON_HEADERS, body: [] }]);
  const out = await service.check!({}, ctx);
  assertEquals(out.state, "unknown");
  assert(out.message?.includes("expected 401"));
});

Deno.test("service: a 403 or 429 says something about the caller, not TickTick", async () => {
  for (const status of [403, 429]) {
    const { ctx } = mockCtx([{ status, headers: JSON_HEADERS, body: {} }]);
    assertEquals((await service.check!({}, ctx)).state, "unknown", `${status}`);
  }
});

Deno.test("service: unsigned posture is declared, and it widens nothing", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.scope, "app");
  assertEquals(service.credential, "none");
  assertEquals(service.network?.allow, ["api.ticktick.com"]);
  // Left at the `degraded` default on purpose — see the module comment.
  assertEquals(service.severity, undefined);
  // A live check, not a declared absence.
  assertEquals(service.unavailable, undefined);
  assertEquals(typeof service.check, "function");
});

Deno.test("quota: declared unavailable with a real reason, at informational severity", () => {
  assertEquals(quota.kind, "quota");
  assertEquals(quota.check, undefined);
  assert(quota.unavailable?.reason);
  assert(quota.unavailable!.reason.length > 100, "the reason must actually explain");
  // An `unavailable` entry reports `unknown`; anything but informational would
  // pin the app's roll-up verdict there forever.
  assertEquals(quota.severity, "informational");
});
