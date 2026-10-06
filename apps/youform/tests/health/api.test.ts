import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import service from "../../health/service.ts";
import quota from "../../health/quota.ts";
import { mockCtx, UNAUTHENTICATED } from "../_helpers.ts";

Deno.test("api: probes /api/me unsigned; a 401 Unauthenticated is ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: UNAUTHENTICATED }]);
  const out = await api.check!({} as never, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out.state, "ok");
  assertEquals(out.message, undefined);
});

Deno.test("api: an unfamiliar 401 message is surfaced but still ok", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Token expired." } }]);
  const out = await api.check!({} as never, ctx);
  assertEquals([out.state, out.message], ["ok", "Token expired."]);
});

Deno.test("api: 404, 5xx, HTML and unexpected 200 are down/down/down/unknown", async () => {
  const { ctx } = mockCtx([
    { status: 404, body: { message: "The route api/me could not be found." } },
    { status: 503, body: { message: "x" } },
    { status: 200, body: "<html></html>", headers: { "content-type": "text/html" } },
    { status: 200, body: { data: {} } },
  ]);
  assertEquals((await api.check!({} as never, ctx)).state, "down");
  assertEquals((await api.check!({} as never, ctx)).state, "down");
  assertEquals((await api.check!({} as never, ctx)).state, "down");
  assertEquals((await api.check!({} as never, ctx)).state, "unknown");
});

Deno.test("service and quota are declared-unavailable at informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assertEquals(typeof h.unavailable?.reason, "string");
  }
});
