import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const creds = { url: "https://xyz.cloud.qdrant.io:6333", apiKey: "qk_1" };
const collections = (names: string[]) => ({
  status: 200,
  body: { result: { collections: names.map((name) => ({ name })) } },
});

/** Its own header, not Authorization, and not Bearer. */
Deno.test("api-key: sign sets the api-key header", () => {
  const request = {
    url: "https://xyz.cloud.qdrant.io:6333/collections",
    method: "GET",
    headers: {},
  };
  const signed = auth.sign!({ request, credential: creds }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["api-key"], "qk_1");
  assertEquals(signed.headers["authorization"], undefined);
});

Deno.test("api-key: test names the collections it found", async () => {
  const { ctx, calls } = mockCtx([collections(["docs", "images"])]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(calls[0].url, "https://xyz.cloud.qdrant.io:6333/collections");
  assertEquals(result.ok, true);
  assert(result.message!.includes("docs"), result.message);
});

/** An empty instance is a normal state, and saying so avoids a false alarm. */
Deno.test("api-key: an instance with no collections still connects", async () => {
  const { ctx } = mockCtx([collections([])]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(result.ok, true);
  assert(/no collections yet/.test(result.message!), result.message);
});

/** A URL with no port would go to 443, which is usually nothing at all. */
Deno.test("api-key: a URL without a port gets Qdrant's REST port", async () => {
  const { ctx, calls } = mockCtx([collections([])]);
  await auth.test!({ credential: { url: "qdrant.internal", apiKey: "qk_1" } }, ctx);
  assertEquals(calls[0].url, "https://qdrant.internal:6333/collections");
});

Deno.test("api-key: a rejected key does not connect", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected/.test(result.message!), result.message);
});

Deno.test("api-key: any other failure reports the status and host", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "" }]);
  const result = await auth.test!({ credential: creds }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("502"), result.message);
});

Deno.test("api-key: a malformed URL is refused before a request", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test!({ credential: { url: "not a url", apiKey: "k" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: a half-missing credential is refused before a request", async () => {
  const noUrl = mockCtx();
  assertEquals((await auth.test!({ credential: { apiKey: "k" } }, noUrl.ctx)).ok, false);
  assertEquals(noUrl.calls.length, 0);

  const noKey = mockCtx();
  assertEquals((await auth.test!({ credential: { url: "https://x:6333" } }, noKey.ctx)).ok, false);
  assertEquals(noKey.calls.length, 0);
});

/** The instance is public metadata; the key never is. */
Deno.test("api-key: afterConnect records the instance, not the key", () => {
  const display = auth.afterConnect!(
    { credential: { url: "xyz.cloud.qdrant.io:6333", apiKey: "qk_secret" } },
    mockCtx().ctx,
  );
  assertEquals(display, {
    url: "https://xyz.cloud.qdrant.io:6333",
    host: "xyz.cloud.qdrant.io:6333",
  });
  assert(!JSON.stringify(display).includes("qk_secret"));
});

Deno.test("api-key: declares the URL and one secret field", () => {
  assertEquals(auth.fields!.map((f) => f.key), ["url", "apiKey"]);
  assertEquals(auth.fields![1].type, "secret");
});
