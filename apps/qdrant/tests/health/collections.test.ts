import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import collections from "../../health/collections.ts";
import quota from "../../health/quota.ts";

const display = { url: "https://xyz.cloud.qdrant.io:6333" };
const list = (names: string[]) => ({
  status: 200,
  body: { result: { collections: names.map((name) => ({ name })) } },
});

Deno.test("collections: names what the key can see", async () => {
  const { ctx, calls } = mockCtx([list(["docs", "images"])], { display });
  const result = await collections.check!({}, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections");
  assertEquals(result.state, "ok");
  assert(result.message!.includes("docs"), result.message);
});

/**
 * An instance that lost its storage comes back ready and empty — which the
 * `instance` check correctly calls healthy.
 */
Deno.test("collections: an empty instance is degraded, with both readings given", async () => {
  const { ctx } = mockCtx([list([])], { display });
  const result = await collections.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert(/lost its storage/.test(result.message!), result.message);
});

Deno.test("collections: a rejected key is unknown, since the derived check owns it", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }], { display });
  assertEquals((await collections.check!({}, ctx)).state, "unknown");
});

Deno.test("collections: any other failure is down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }], { display });
  assertEquals((await collections.check!({}, ctx)).state, "down");
});

Deno.test("collections: a connection with no URL says so", async () => {
  const { ctx, calls } = mockCtx([], { display: {} });
  assertEquals((await collections.check!({}, ctx)).state, "unknown");
  assertEquals(calls.length, 0);
});

/**
 * A database you run has no request quota — its limits are the machine's, and
 * `/metrics` is a monitoring surface rather than a consumption reading.
 */
Deno.test("quota: is a declared absence explaining why a self-hosted DB has none", () => {
  assertEquals(quota.check, undefined);
  assert(quota.unavailable, "quota should declare its absence");
  const reason = quota.unavailable!.reason;
  assert(/database you run/.test(reason), reason);
  assert(/Prometheus/.test(reason), reason);
  assert(/configuration, not consumption/.test(reason), reason);
  assert(/2026-08-18/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});
