import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import instance from "../../health/instance.ts";

const display = { url: "https://xyz.cloud.qdrant.io:6333" };

Deno.test("instance: a ready instance is ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "all shards are ready" }], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/readyz");
  assertEquals(result.state, "ok");
});

/**
 * A restarting Qdrant answers livez immediately and readyz only when it can
 * serve — reporting on livez would call the whole window healthy.
 */
Deno.test("instance: not ready but alive is degraded, with the reason", async () => {
  const { ctx, calls } = mockCtx([
    { status: 503, body: "" },
    { status: 200, body: "healthz check passed" },
  ], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(calls[1].url, "https://xyz.cloud.qdrant.io:6333/livez");
  assertEquals(result.state, "degraded");
  assert(/rebuilding indexes/.test(result.message!), result.message);
});

Deno.test("instance: not ready and not alive is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }, { status: 503, body: "" }], { display });
  assertEquals((await instance.check!({}, ctx)).state, "down");
});

Deno.test("instance: an unreachable host is down", async () => {
  const { ctx } = mockCtx([], { display });
  const result = await instance.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("instance: a connection with no URL says so rather than guessing", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await instance.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/** Liveness is a separate question from whether the key is any good. */
Deno.test("instance: probes without a credential", () => {
  assertEquals(instance.credential, "context");
});
