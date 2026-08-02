import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/admin-api-key.ts";

const VALID_KEY = `5f3a1b2c3d4e5f6a7b8c9d0e:${"0123456789abcdef".repeat(4)}`;

function base64UrlDecodeJson(segment: string): unknown {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return JSON.parse(atob(padded + pad));
}

Deno.test("admin-api-key: declares siteUrl / apiKey fields, apiKey is secret", () => {
  assertEquals(auth.key, "admin-api-key");
  assertEquals(auth.type, "custom");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("siteUrl"));
  assert(keys.includes("apiKey"));
  const apiKey = auth.fields?.find((f) => f.key === "apiKey");
  assertEquals(apiKey?.type, "secret");
  assertEquals(apiKey?.required, true);
});

Deno.test("admin-api-key: sign injects `Ghost <jwt>` with the key id as `kid`", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: VALID_KEY } }, ctx);
  const [scheme, token] = out.headers["authorization"].split(" ");
  assertEquals(scheme, "Ghost");
  const parts = token.split(".");
  assertEquals(parts.length, 3);
  const header = base64UrlDecodeJson(parts[0]) as { alg: string; kid: string };
  assertEquals(header.alg, "HS256");
  assertEquals(header.kid, "5f3a1b2c3d4e5f6a7b8c9d0e");
});

Deno.test("admin-api-key: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { siteUrl: "https://example.com" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("admin-api-key: test reports failure without a network call on a malformed key", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test(
    { credential: { siteUrl: "https://example.com", apiKey: "not-a-key" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("Admin API Key"));
  assertEquals(calls.length, 0);
});

Deno.test("admin-api-key: test hits GET <siteUrl>/ghost/api/admin/users/?limit=1 with a Ghost JWT", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { users: [{ id: "1" }] } }]);
  const result = await auth.test(
    { credential: { siteUrl: "https://example.com", apiKey: VALID_KEY } },
    ctx,
  );
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/ghost/api/admin/users/");
  assertEquals(url.searchParams.get("limit"), "1");
  assert(calls[0].headers["authorization"].startsWith("Ghost "));
});

Deno.test("admin-api-key: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    { credential: { siteUrl: "https://example.com", apiKey: VALID_KEY } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("admin-api-key: afterConnect records siteUrl/host and fetches unauthenticated /site/", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { site: { title: "My Blog", version: "5.100" } } },
  ]);
  const result = await auth.afterConnect!(
    { credential: { siteUrl: "https://example.com", apiKey: VALID_KEY } },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/ghost/api/admin/site/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result, {
    siteUrl: "https://example.com",
    site: { title: "My Blog", version: "5.100", host: "example.com" },
  });
});

Deno.test("admin-api-key: afterConnect degrades gracefully when /site/ fails", async () => {
  const { ctx } = mockCtx([{ status: 500 }]);
  const result = await auth.afterConnect!(
    { credential: { siteUrl: "https://example.com", apiKey: VALID_KEY } },
    ctx,
  );
  assertEquals(result, {
    siteUrl: "https://example.com",
    site: { title: undefined, version: undefined, host: "example.com" },
  });
});
