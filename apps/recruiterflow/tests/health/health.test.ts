import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import service from "../../health/service.ts";
import { mockCtx } from "../_helpers.ts";

const run = (r: Parameters<typeof mockCtx>[0]) => api.check!({} as never, mockCtx(r).ctx);

Deno.test("api: the vendor's missing-key 400 body proves reachability (ok)", async () => {
  const out = await run([{ status: 400, body: { message: "Please supply an API key" } }]);
  assertEquals(out.state, "ok");
});

Deno.test("api: 5xx is down, non-JSON 200 is unknown, other JSON is unknown", async () => {
  assertEquals((await run([{ status: 503, body: { message: "x" } }])).state, "down");
  assertEquals((await run([{ status: 200, body: "<html>" }])).state, "unknown");
  assertEquals((await run([{ status: 200, body: { ok: 1 } }])).state, "unknown");
  assertEquals((await run([{ status: 502, body: "<html>" }])).state, "down");
});

Deno.test("api: is unsigned, targets /info", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("service: declared absence with informational severity", () => {
  assertEquals(service.severity, "informational");
  assertEquals(typeof service.unavailable?.reason, "string");
  assertEquals(service.check, undefined);
});
