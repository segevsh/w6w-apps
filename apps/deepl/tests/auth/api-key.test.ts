import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";
import { FREE_URL, PRO_URL } from "../../lib/client.ts";

Deno.test("api-key: is an apiKey method exposing a single `apiKey` secret field", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey?.in, "header");
  assertEquals(auth.apiKey?.name, "Authorization");
  assertEquals(auth.apiKey?.prefix, "DeepL-Auth-Key ");
  const field = auth.fields?.find((f) => f.key === "apiKey");
  assert(field, "must declare an `apiKey` field");
  assertEquals(field.type, "secret");
  assertEquals(field.required, true);
});

Deno.test("api-key: sign stamps DeepL-Auth-Key (not Bearer) and never touches the URL", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://placeholder.example/v2/usage",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "sk-abc:fx" } }, ctx);
  assertEquals(out.headers["authorization"], "DeepL-Auth-Key sk-abc:fx");
  assertEquals(out.url, "https://placeholder.example/v2/usage");
});

Deno.test("api-key: test routes a Free key (:fx suffix) to api-free.deepl.com", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { character_count: 0 } }]);
  const result = await auth.test({ credential: { apiKey: "abc:fx" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, FREE_URL);
  assertEquals(url.pathname, "/v2/usage");
  assertEquals(calls[0].headers["authorization"], "DeepL-Auth-Key abc:fx");
});

Deno.test("api-key: test routes a Pro key (no suffix) to api.deepl.com", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { character_count: 0 } }]);
  const result = await auth.test({ credential: { apiKey: "abc" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, PRO_URL);
});

Deno.test("api-key: test reports failure with status code when the API rejects", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  const result = await auth.test({ credential: { apiKey: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("403"));
});

Deno.test("api-key: afterConnect labels a :fx key 'free' and a bare key 'pro'", async () => {
  const { ctx } = mockCtx();
  const free = await auth.afterConnect!({ credential: { apiKey: "abc:fx" } }, ctx);
  assertEquals(free.plan, "free");
  const pro = await auth.afterConnect!({ credential: { apiKey: "abc" } }, ctx);
  assertEquals(pro.plan, "pro");
});
