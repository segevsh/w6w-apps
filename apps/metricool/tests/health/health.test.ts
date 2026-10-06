import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import quota from "../../health/quota.ts";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const run = async (r: Parameters<typeof mockCtx>[0]) => {
  const m = mockCtx(r);
  const out = await api.check!({} as never, m.ctx);
  return { out, calls: m.calls };
};

Deno.test("api: the documented UP body passes, unsigned", async () => {
  const { out, calls } = await run([{ body: { status: "UP", message: "Application is healthy" } }]);
  assertEquals(out.state, "ok");
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["x-mc-auth"], undefined);
});

Deno.test("api: a 200 HTML shell is unknown, never ok", async () => {
  const { out } = await run([{
    body: "<!doctype html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals(out.state, "unknown");
});

Deno.test("api: a 200 JSON without status UP is unknown", async () => {
  assertEquals((await run([{ body: { hello: 1 } }])).out.state, "unknown");
});

Deno.test("api: 5xx and a DOWN body are down", async () => {
  assertEquals((await run([{ status: 503, body: "bad" }])).out.state, "down");
  assertEquals((await run([{ body: { status: "DOWN" } }])).out.state, "down");
});

Deno.test("service and quota: declared unavailable at informational severity", () => {
  for (const h of [service, quota]) {
    assertEquals(h.severity, "informational");
    assertEquals(typeof h.unavailable?.reason, "string");
    assertEquals(h.check, undefined);
  }
});
