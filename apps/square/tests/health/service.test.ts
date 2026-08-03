import { assert, assertEquals } from "@std/assert";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("service: is an unsigned, app-scoped check that widens egress to the status host only", () => {
  assertEquals(service.kind, "service");
  assertEquals(service.network?.allow, ["issquareup.com"]);
  // Scope/credential are left at this kind's defaults (`app` / `none`), which
  // is what makes widening egress safe.
  assertEquals(service.scope, undefined);
  assertEquals(service.credential, undefined);
  assert(service.check, "service check has no hook");
  // The status host must NOT be an API host — those are on the app allowlist.
  assert(!service.network!.allow!.some((h) => h.includes("squareup.com/")));
});

Deno.test("service: probes Square's status.json rollup", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: { indicator: "none", description: "All Systems Operational" } },
  }]);
  const report = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://issquareup.com/api/v2/status.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "All Systems Operational");
  assertEquals(report.ttlSeconds, 60);
  // Square publishes an empty components array, so none are reported.
  assertEquals(report.components, undefined);
});

Deno.test("service: maps each Statuspage indicator onto a health state", async () => {
  const cases: Array<[string, string]> = [
    ["none", "ok"],
    ["minor", "degraded"],
    ["major", "down"],
    ["critical", "down"],
  ];
  for (const [indicator, expected] of cases) {
    const { ctx } = mockCtx([{ body: { status: { indicator } } }]);
    assertEquals((await service.check!({}, ctx)).state, expected, indicator);
  }
});

Deno.test("service: an unrecognised indicator is unknown, not ok", async () => {
  const { ctx } = mockCtx([{ body: { status: { indicator: "maintenance-ish" } } }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});

Deno.test("service: a broken status page reports unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("503"));
});

Deno.test("service: a non-JSON 200 reports unknown rather than throwing", async () => {
  const { ctx } = mockCtx([{ body: "<html>nope</html>", headers: {} }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");
});
