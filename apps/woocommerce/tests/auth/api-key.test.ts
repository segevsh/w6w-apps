import { assert, assertEquals } from "@std/assert";
import { encodeBase64 } from "@std/encoding";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: declares storeUrl / consumerKey / consumerSecret fields", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "basic");
  const keys = (auth.fields ?? []).map((f) => f.key);
  assert(keys.includes("storeUrl"));
  assert(keys.includes("consumerKey"));
  assert(keys.includes("consumerSecret"));
  const secret = auth.fields?.find((f) => f.key === "consumerSecret");
  assertEquals(secret?.type, "secret");
  assertEquals(secret?.required, true);
});

Deno.test("api-key: sign injects a Basic Authorization header from ck:cs", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { consumerKey: "ck_123", consumerSecret: "cs_456" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], `Basic ${encodeBase64("ck_123:cs_456")}`);
});

Deno.test("api-key: test hits <storeUrl>/wp-json/wc/v3/system_status with Basic auth", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { environment: {} } }]);
  const result = await auth.test(
    {
      credential: {
        storeUrl: "https://shop.example.com",
        consumerKey: "ck_123",
        consumerSecret: "cs_456",
      },
    },
    ctx,
  );
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://shop.example.com/wp-json/wc/v3/system_status");
  assertEquals(calls[0].headers["authorization"], `Basic ${encodeBase64("ck_123:cs_456")}`);
});

Deno.test("api-key: test reports failure without a network call when fields are missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: { consumerKey: "ck_123" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: test surfaces upstream status on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test(
    {
      credential: {
        storeUrl: "https://shop.example.com",
        consumerKey: "ck_bad",
        consumerSecret: "cs_bad",
      },
    },
    ctx,
  );
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
});

Deno.test("api-key: afterConnect republishes storeUrl and store.host", async () => {
  const { ctx } = mockCtx();
  const display = await auth.afterConnect!(
    {
      credential: {
        storeUrl: "https://shop.example.com",
        consumerKey: "ck_123",
        consumerSecret: "cs_456",
      },
    },
    ctx,
  );
  assertEquals((display as { storeUrl?: string }).storeUrl, "https://shop.example.com");
  assertEquals((display as { store?: { host?: string } }).store?.host, "shop.example.com");
});
