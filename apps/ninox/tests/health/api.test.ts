import { assertEquals } from "@std/assert";
import api, { PROBE_URL } from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const run = (r: Parameters<typeof mockCtx>[0]) => api.check!({} as never, mockCtx(r).ctx);

Deno.test("api health: is unsigned, a dependency check", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.kind, "dependency");
});

Deno.test("api health: probes the documented workspace path without a credential", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: "Workspace orchestrator error",
    headers: {},
  }]);
  await api.check!({} as never, ctx);
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("api health: a non-HTML 401 or 403 is ok", async () => {
  assertEquals(
    (await run([{ status: 401, body: "Workspace orchestrator error", headers: {} }])).state,
    "ok",
  );
  assertEquals((await run([{ status: 403, body: { error: { message: "x" } } }])).state, "ok");
});

Deno.test("api health: the HTML web-app shell is unknown, even at 200", async () => {
  assertEquals(
    (await run([{ status: 200, body: "<!doctype html>", headers: {} }])).state,
    "unknown",
  );
  assertEquals((await run([{ status: 401, body: "<html>", headers: {} }])).state, "unknown");
});

Deno.test("api health: a 5xx is down; anything else unexpected is unknown", async () => {
  assertEquals((await run([{ status: 502, body: "bad gateway", headers: {} }])).state, "down");
  assertEquals((await run([{ status: 204 }])).state, "unknown");
});
