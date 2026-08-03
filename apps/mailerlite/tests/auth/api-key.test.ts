import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares an apiKey method sending a Bearer Authorization header", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "Authorization");
  assertEquals(auth.apiKey?.prefix, "Bearer ");
});

Deno.test("api-key: the token field is a required secret", () => {
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign injects `Authorization: Bearer <token>`", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://connect.mailerlite.com/api/subscribers",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "ml-token-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer ml-token-abc");
});

Deno.test("api-key: sign does NOT use the Classic API's X-MailerLite-ApiKey header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://connect.mailerlite.com/api/subscribers",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "ml-token-abc" } }, ctx);
  assertEquals(out.headers["x-mailerlite-apikey"], undefined);
  assertEquals(out.headers["X-MailerLite-ApiKey"], undefined);
});

Deno.test("api-key: test with a missing token reports the failure without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("apiKey"), "message should mention apiKey");
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test probes the subscriber count endpoint with the bearer token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { total: 100 } }]);
  const result = await auth.test({ credential: { apiKey: "ml-token-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "connect.mailerlite.com");
  assertEquals(url.pathname, "/api/subscribers");
  assertEquals(url.searchParams.get("limit"), "0");
  assertEquals(calls[0].headers["authorization"], "Bearer ml-token-abc");
});

Deno.test("api-key: test surfaces the upstream status on a 401", async () => {
  const { ctx } = mockCtx([{ status: 401, body: '{"message":"Unauthenticated."}' }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: declares no afterConnect — MailerLite publishes no account endpoint", () => {
  assertEquals(auth.afterConnect, undefined);
});
