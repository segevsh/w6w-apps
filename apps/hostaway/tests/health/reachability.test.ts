import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import reachability from "../../health/reachability.ts";

const URL_UNDER_TEST = "https://api.hostaway.com/v1/users?limit=1";

Deno.test("reachability: probes the users endpoint UNSIGNED, so a dead credential cannot fake an outage", async () => {
  assertEquals(reachability.key, "reachability");
  assertEquals(reachability.kind, "dependency");
  assertEquals(reachability.credential, "none");
  assertEquals(reachability.severity, "informational");

  const { ctx, calls } = mockCtx([{ body: { status: "success", result: [] } }]);
  await reachability.check!({}, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("reachability: a well-formed fail envelope proves the API is there", async () => {
  // Verified live 2026-09-22: an anonymous call answers 403 with this exact body.
  const { ctx } = mockCtx([{
    status: 403,
    body: {
      status: "fail",
      message: "The resource owner or authorization server denied the request.",
    },
  }]);
  const report = await reachability.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message?.includes("reachable"));
});

Deno.test("reachability: accepts `result` as the failure carrier too (the docs' Standard Response)", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { status: "fail", result: "denied" } }]);
  const report = await reachability.check!({}, ctx);
  assertEquals(report.state, "ok");
});

Deno.test("reachability: never reports down — an unreachable host is unknown", async () => {
  const { ctx } = mockCtx([]);
  const report = await reachability.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("api.hostaway.com"));
});

Deno.test("reachability: something that is not Hostaway's envelope is degraded, not ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html>captive portal</html>",
    headers: { "content-type": "text/html" },
  }]);
  const report = await reachability.check!({}, ctx);
  assertEquals(report.state, "degraded");
  assert(report.message?.includes("captive portal"));
});
