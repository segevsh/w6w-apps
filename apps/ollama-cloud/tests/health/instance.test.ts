import { assert, assertEquals } from "@std/assert";
import check from "../../health/instance.ts";
import { mockCtx } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

const run = (ctx: HookContext) => check.check!({} as never, ctx);

Deno.test("instance: declared as a signed per-connection dependency probe", () => {
  assertEquals(check.kind, "dependency");
  assertEquals(check.scope, "connection");
  assertEquals(check.credential, "signed");
  assertEquals(check.network, undefined);
});

Deno.test("instance: ok with the version when /api/version answers", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { version: "0.34.1" } }]);
  const result = await run(ctx);
  assertEquals(calls[0].url, "https://ollama.com/api/version");
  assertEquals(result.state, "ok");
  assert(/0\.34\.1/.test(result.message!), result.message);
});

Deno.test("instance: a host that will not answer is down, naming the host", async () => {
  const { ctx } = mockCtx([]);
  const result = await run({ ...ctx, fetch: () => Promise.reject(new Error("dns")) });
  assertEquals(result.state, "down");
  assert(/ollama\.com/.test(result.message!), result.message);
});

Deno.test("instance: a 401 is unknown — the auth check owns credential failures", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "no" }]);
  assertEquals((await run(ctx)).state, "unknown");
});

Deno.test("instance: a 5xx is down, and a 200 that is not Ollama is degraded", async () => {
  assertEquals(
    (await run(mockCtx([{ status: 502, body: "bad gateway" }]).ctx)).state,
    "down",
  );
  assertEquals(
    (await run(mockCtx([{ status: 200, body: "<html>" }]).ctx)).state,
    "degraded",
  );
  assertEquals(
    (await run(mockCtx([{ status: 200, body: { a: 1 } }]).ctx)).state,
    "degraded",
  );
});
