import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth, { environmentOf } from "../../auth/api-key.ts";

Deno.test("api-key: the prefix decides the environment", () => {
  assertEquals(environmentOf("sk_live_abc"), "production");
  assertEquals(environmentOf("sk_test_abc"), "staging");
  assertEquals(environmentOf("something-else"), "unknown");
});

Deno.test("api-key: sign sets a Bearer header", () => {
  const request = { url: "https://api.workos.com/organizations", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { apiKey: "sk_test_1" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], "Bearer sk_test_1");
});

Deno.test("api-key: test probes the cheapest list and names the environment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "org_1" }] } }]);
  const result = await auth.test!({ credential: { apiKey: "sk_live_1" } }, ctx);
  assertEquals(calls[0].url, "https://api.workos.com/organizations?limit=1");
  assertEquals(result.ok, true);
  assert(result.message!.includes("production"), result.message);
});

/**
 * An empty environment looks exactly like a broken connection, so the test says
 * which it is rather than leaving it to be discovered later.
 */
Deno.test("api-key: an environment with no organizations still connects, and says so", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { data: [] } }]);
  const result = await auth.test!({ credential: { apiKey: "sk_test_1" } }, ctx);
  assertEquals(result.ok, true);
  assert(result.message!.includes("staging"), result.message);
  assert(result.message!.includes("no organizations"), result.message);
});

Deno.test("api-key: a 401 fails with the key named, not a status code", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthorized" } }]);
  const result = await auth.test!({ credential: { apiKey: "sk_test_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/api key/i.test(result.message!), result.message);
});

Deno.test("api-key: any other failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "sk_test_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
});

Deno.test("api-key: a missing credential is refused before a request is made", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/** The environment is public metadata; the key never is. */
Deno.test("api-key: afterConnect records the environment and nothing else", () => {
  const display = auth.afterConnect!({ credential: { apiKey: "sk_live_secret" } }, mockCtx().ctx);
  assertEquals(display, { environment: "production" });
  assert(!JSON.stringify(display).includes("secret"));
});

Deno.test("api-key: declares exactly one secret field", () => {
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey"]);
  assertEquals(auth.fields![0].type, "secret");
});
