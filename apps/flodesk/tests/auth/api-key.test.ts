import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("api-key: declares HTTP Basic, matching Flodesk's `http`/`basic` scheme", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  // `apiKey` config would imply a verbatim-value header; Flodesk base64-encodes.
  assertEquals(auth.apiKey, undefined);
});

Deno.test("api-key: collects exactly one secret field — the password half is fixed empty", () => {
  assertEquals(auth.fields?.length, 1);
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "no apiKey field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign builds Basic base64(`key:`) — with the trailing colon", () => {
  const request = {
    url: "https://api.flodesk.com/v1/segments",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!(
    { request, credential: { apiKey: "fd_key_123" } } as never,
    undefined as never,
  ) as typeof request;

  assertEquals(out.headers["authorization"], `Basic ${btoa("fd_key_123:")}`);
  // Decode it back and prove the empty password survived.
  const decoded = atob(out.headers["authorization"].slice("Basic ".length));
  assertEquals(decoded, "fd_key_123:");
  assert(decoded.endsWith(":"), "the empty password separator is load-bearing");
});

Deno.test("api-key: sign never leaks the key into the URL", () => {
  const request = {
    url: "https://api.flodesk.com/v1/segments",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!(
    { request, credential: { apiKey: "fd_key_123" } } as never,
    undefined as never,
  ) as typeof request;
  assert(!out.url.includes("fd_key_123"), "credential leaked into the URL");
});

Deno.test("api-key: test probes GET /v1/segments/colors and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: ["#B7D4C7", "#E5D4C0"] }]);
  const out = await auth.test!({ credential: { apiKey: "fd_key_123" } } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, "https://api.flodesk.com/v1/segments/colors");
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("fd_key_123:")}`);
  assertEquals(out.ok, true);
});

Deno.test("api-key: test reports the status and body on a rejected key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", message: "Unauthorized access is denied!" },
  }]);
  const out = await auth.test!({ credential: { apiKey: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("401"));
  assert(out.message?.includes("unauthorized"));
});

Deno.test("api-key: test fails fast when the credential has no key", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.test!({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0, "should not have called the network");
});

Deno.test("api-key: declares no afterConnect — Flodesk has no whoami under /v1", () => {
  assertEquals(auth.afterConnect, undefined);
  assertEquals(auth.connectionLabel, undefined);
});
