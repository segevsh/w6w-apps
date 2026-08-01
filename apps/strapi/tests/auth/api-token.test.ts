import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: declares endpoint / apiToken fields", () => {
  assertEquals(auth.key, "api-token");
  assertEquals(auth.type, "bearer");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("endpoint"));
  assert(keys.includes("apiToken"));
  const secret = auth.fields?.find((f) => f.key === "apiToken");
  assertEquals(secret?.type, "secret");
  assertEquals(secret?.required, true);
});

Deno.test("api-token: sign injects a Bearer Authorization header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "abc123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer abc123");
});

Deno.test("api-token: test hits the paginated Media Library endpoint with the Bearer header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [], pagination: {} } }]);
  const result = await auth.test(
    { credential: { endpoint: "https://example.com", apiToken: "abc123" } },
    ctx,
  );
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://example.com/api/upload/files/page");
  assertEquals(url.searchParams.get("pagination[pageSize]"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer abc123");
});

Deno.test("api-token: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { endpoint: "https://example.com" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test fails on 401 (token rejected)", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    { credential: { endpoint: "https://example.com", apiToken: "bad" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-token: test succeeds on 403 (token valid, scoped away from Upload)", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test(
    { credential: { endpoint: "https://example.com", apiToken: "custom-scoped" } },
    ctx,
  );
  assertEquals(result.ok, true);
});

Deno.test("api-token: test fails on a 5xx (server error, inconclusive but not proven live)", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test(
    { credential: { endpoint: "https://example.com", apiToken: "abc123" } },
    ctx,
  );
  assertEquals(result.ok, false);
});

Deno.test("api-token: afterConnect republishes endpoint onto the connection display", () => {
  const out = auth.afterConnect!(
    { credential: { endpoint: "https://example.com", apiToken: "abc123" } },
    mockCtx().ctx,
  );
  assertEquals(out, { endpoint: "https://example.com" });
});
