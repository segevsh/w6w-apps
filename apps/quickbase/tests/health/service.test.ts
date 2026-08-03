import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/service.ts";

Deno.test("service: declares an unsigned, app-scoped posture and widens egress narrowly", () => {
  assertEquals(check.kind, "service");
  // Defaults for kind `service` are scope `app` + credential `none`; both are
  // left implicit, so assert the spec-relevant part: egress is widened to the
  // status host ONLY, and the app's own allowlist does not contain it.
  assertEquals(check.network?.allow, ["quickbasestatus.status.page"]);
  assertEquals(check.credential, undefined);
  assertEquals(check.scope, undefined);
});

Deno.test("service: reports ok for the observed `Available` value", async () => {
  const { ctx, calls } = mockCtx([{
    body: { Status: "Available", StatusText: "Normal", InEffectSince: "2026-08-03T10:41:00" },
  }]);
  const report = await check.check!({}, ctx);

  assertEquals(calls[0].url, "https://quickbasestatus.status.page/status.json");
  assertEquals(report.state, "ok");
  assertEquals(report.message, "Normal");
});

Deno.test("service: any other status is degraded, never an invented `down`", async () => {
  // StatusCast publishes no vocabulary, so the check refuses to grade severity
  // it cannot verify. `degraded` is the honest ceiling.
  for (const status of ["Disrupted", "Unavailable", "Maintenance"]) {
    const { ctx } = mockCtx([{ body: { Status: status, StatusText: `${status} services` } }]);
    const report = await check.check!({}, ctx);
    assertEquals(report.state, "degraded", `expected degraded for ${status}`);
    assertEquals(report.message, `${status} services`);
  }
});

Deno.test("service: matches the healthy value case-insensitively", async () => {
  const { ctx } = mockCtx([{ body: { Status: "available" } }]);
  assertEquals((await check.check!({}, ctx)).state, "ok");
});

Deno.test("service: falls back to the machine value when StatusText is blank", async () => {
  const { ctx } = mockCtx([{ body: { Status: "Disrupted", StatusText: "  " } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.message, "Disrupted");
});

Deno.test("service: a broken status page is `unknown`, not `down`", async () => {
  // A status page that itself fails tells us nothing about the vendor.
  const { ctx } = mockCtx([{ status: 503, body: {} }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("503"));
});

Deno.test("service: an HTML catch-all masquerading as JSON reports unknown", async () => {
  // The status host really does serve a 200 HTML catch-all on unknown paths;
  // if StatusCast ever moved the route, the body would not parse.
  const { ctx } = mockCtx([{ headers: { "content-type": "text/html" }, body: "<!DOCTYPE html>" }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("no Status field"));
});

Deno.test("service: reports no components, because the endpoint provides none", async () => {
  const { ctx } = mockCtx([{ body: { Status: "Available" } }]);
  const report = await check.check!({}, ctx);
  assertEquals(report.components, undefined);
});
