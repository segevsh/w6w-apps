import { assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import api, { PROBE_URL } from "../../health/api.ts";
import { envelope, errorEnvelope, mockCtx } from "../_helpers.ts";

// deno-lint-ignore no-explicit-any
const check = api.check as any;

Deno.test("api: unsigned ping on the API host; no extra network allowlist", () => {
  assertEquals(PROBE_URL, "https://www.digistore24.com/api/call/ping");
  assertEquals(api.credential, "none");
  assertEquals(api.network, undefined);
});

/** Measured live: an unsigned ping answers 200 {"result":"error","code":2}. */
Deno.test("api: a schema-correct no-key error envelope is a pass", async () => {
  const { ctx, calls } = mockCtx([{ body: errorEnvelope("No API key given.", 2) }]);
  assertEquals((await check({}, ctx)).state, "ok");
  assertEquals("x-ds-api-key" in calls[0].headers, false);
});

Deno.test("api: a success envelope is a pass too", async () => {
  const { ctx } = mockCtx([{ body: envelope({ server_time: "2026-10-05 20:34:19" }) }]);
  assertEquals((await check({}, ctx)).state, "ok");
});

Deno.test("api: 5xx, markup and network failure are down; unreadable JSON is unknown", async () => {
  const { ctx } = mockCtx([
    { status: 503, body: "oops" },
    { status: 200, body: "<html>maintenance</html>" },
    { status: 200, body: '{"hello":1}' },
  ]);
  assertEquals((await check({}, ctx)).state, "down");
  assertEquals((await check({}, ctx)).state, "down");
  assertEquals((await check({}, ctx)).state, "unknown");

  const boom = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as HookContext;
  assertEquals((await check({}, boom)).state, "down");
});
