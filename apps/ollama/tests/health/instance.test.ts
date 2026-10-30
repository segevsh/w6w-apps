import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import check from "../../health/instance.ts";

const display = { scheme: "http", host: "192.168.1.50", port: 11434 };
import type { HookContext } from "@w6w/types";
const run = (ctx: HookContext) => check.check!({} as never, ctx);

test("instance: declared as a signed per-connection dependency probe", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "signed");
});

test("instance: ok with the version when /api/version answers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { version: "0.34.1" } }], { display });
  const result = await run(ctx);
  assertEquals(calls[0].url, "http://192.168.1.50:11434/api/version");
  assertEquals(result.state, "ok");
  assert(/0\.34\.1/.test(result.message!), result.message);
});

test("instance: a refused connection is down, and a private address says why that may be", async () => {
  const { ctx } = mockCtx([], { display });
  const failing = {
    ...ctx,
    fetch: () => Promise.reject(new Error("ECONNREFUSED")),
  };
  const result = await run(failing);
  assertEquals(result.state, "down");
  assert(/same network/.test(result.message!), result.message);
});

test("instance: a public host that will not answer is down without the LAN note", async () => {
  const { ctx } = mockCtx([], { display: { scheme: "https", host: "o.example.com", port: 443 } });
  const result = await run({ ...ctx, fetch: () => Promise.reject(new Error("dns")) });
  assertEquals(result.state, "down");
  assert(!/same network/.test(result.message!), result.message);
});

test("instance: a 401 is unknown — the auth check owns credential failures", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "no" }], { display });
  assertEquals((await run(ctx)).state, "unknown");
});

test("instance: a 5xx is down, and a 200 that is not Ollama is degraded", async () => {
  assertEquals(
    (await run(mockCtx([{ status: 502, body: "bad gateway" }], { display }).ctx)).state,
    "down",
  );
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html>" }], { display }).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await run(mockCtx([{ status: 200, body: { a: 1 } }], { display }).ctx)).state,
    "degraded",
  );
});

test("instance: a connection with no host is unknown, with no request", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await run(ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});
