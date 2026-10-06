import { assert, assertEquals } from "@std/assert";
import api, { API_URL } from "../health/api.ts";
import quota from "../health/quota.ts";
import service from "../health/service.ts";
import { mockCtx } from "./_helpers.ts";

Deno.test("health/api: a schema-correct Unauthenticated 401 proves reachability (ok)", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assertEquals(calls[0].url, API_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(api.credential, "none");
});

Deno.test("health/api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: { message: "unavailable" } }]);
  assertEquals((await api.check!({}, ctx)).state, "down");
});

Deno.test("health/api: a 5xx HTML page is down, a 200 HTML shell is unknown", async () => {
  const html = { "content-type": "text/html" };
  const a = mockCtx([{ status: 502, body: "<html>bad gateway</html>", headers: html }]);
  assertEquals((await api.check!({}, a.ctx)).state, "down");
  const b = mockCtx([{ status: 200, body: "<html>shell</html>", headers: html }]);
  assertEquals((await api.check!({}, b.ctx)).state, "unknown");
});

Deno.test("health/api: JSON that is not thanks.io's auth error is unknown", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { hello: "world" } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message?.includes("unexpected"), report.message);
});

Deno.test("health: service and quota are informational declared absences", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assert(h.unavailable?.reason);
    assertEquals(h.check, undefined);
  }
  assert(service.unavailable!.reason.includes("status.thanks.io"));
});
