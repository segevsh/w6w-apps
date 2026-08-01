import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { encodeBase64 } from "../../lib/client.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares endpoint / apiKeyId / apiKey fields", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("endpoint"));
  assert(keys.includes("apiKeyId"));
  assert(keys.includes("apiKey"));
  const secret = auth.fields?.find((f) => f.key === "apiKey");
  assertEquals(secret?.type, "secret");
  assertEquals(secret?.required, true);
});

Deno.test("api-key: sign injects an ApiKey Authorization header from base64(id:key)", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { apiKeyId: "VuaCfGcB", apiKey: "ui2lp2axTNmsyakw" } },
    ctx,
  );
  assertEquals(
    out.headers["authorization"],
    `ApiKey ${encodeBase64("VuaCfGcB:ui2lp2axTNmsyakw")}`,
  );
});

Deno.test("api-key: test hits <endpoint>/_security/_authenticate with the ApiKey header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { username: "elastic" } }]);
  const result = await auth.test(
    {
      credential: {
        endpoint: "https://example.com:9200",
        apiKeyId: "id1",
        apiKey: "secret1",
      },
    },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://example.com:9200/_security/_authenticate");
  assertEquals(calls[0].headers["authorization"], `ApiKey ${encodeBase64("id1:secret1")}`);
});

Deno.test("api-key: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { apiKeyId: "id1" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    {
      credential: {
        endpoint: "https://example.com:9200",
        apiKeyId: "id1",
        apiKey: "bad-secret",
      },
    },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: afterConnect republishes endpoint onto the connection display", () => {
  const out = auth.afterConnect!(
    { credential: { endpoint: "https://example.com:9200", apiKeyId: "id1", apiKey: "s" } },
    mockCtx().ctx,
  );
  assertEquals(out, { endpoint: "https://example.com:9200" });
});
