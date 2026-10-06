import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, PROBE_PATH } from "../../auth/api-key.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const cred = { credential: { apiKey: "sk_live_secret_value" } };

Deno.test("api-key: is an apiKey method in the X-API-Key header with one secret field", () => {
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey?.in, "header");
  assertEquals(apiKey.apiKey?.name, "X-API-Key");
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});

Deno.test("api-key: sign stamps x-api-key on the request and nothing else", async () => {
  const request = { url: "https://simplero.com/api/v2/lists", method: "GET", headers: {} } as {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  const signed = await apiKey.sign!({ request, credential: cred.credential } as never, {} as never);
  assertEquals((signed as typeof request).headers, { "x-api-key": "sk_live_secret_value" });
});

Deno.test("api-key: authHeaders tolerates a missing key", () => {
  assertEquals(authHeaders({}), { "x-api-key": "" });
});

Deno.test("api-key: test passes when the probe answers a data array, and does not echo the key", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody([{ id: 1, name: "Newsletter" }]) }]);
  const result = await apiKey.test(cred as never, ctx);
  assertEquals(result.ok, true);
  assertEquals(pathOf(calls[0].url), PROBE_PATH);
  assertEquals(queryOf(calls[0].url), { per_page: "1" });
  assertEquals(calls[0].headers["x-api-key"], "sk_live_secret_value");
  assert(calls[0].headers["user-agent"]?.startsWith("w6w-simplero/"));
  assert(!JSON.stringify(result).includes("sk_live_secret_value"));
});

Deno.test("api-key: test fails on the vendor's own `error` body and names it", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Bad API key" } }]);
  const result = await apiKey.test(cred as never, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("Bad API key"), result.message);
  assert(!result.message?.includes("sk_live_secret_value"));
});

Deno.test("api-key: a 200 whose body is not a data array is NOT a pass", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "text/html" }, body: "<html>app</html>" }]);
  const result = await apiKey.test(cred as never, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: an `error` body decides even when the status line says 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { error: "Bad API key" } }]);
  assertEquals((await apiKey.test(cred as never, ctx)).ok, false);
});

Deno.test("api-key: a blank key fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await apiKey.test({ credential: { apiKey: "  " } } as never, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
