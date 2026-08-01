import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

Deno.test("api-key: is an apiKey auth method exposing apiUrl + apiKey fields", () => {
  assertEquals(auth.key, "api-key");
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "Api-Token" });
  const apiUrlField = auth.fields?.find((f) => f.key === "apiUrl");
  assert(apiUrlField, "must declare an `apiUrl` field");
  assertEquals(apiUrlField.required, true);
  const apiKeyField = auth.fields?.find((f) => f.key === "apiKey");
  assert(apiKeyField, "must declare an `apiKey` field");
  assertEquals(apiKeyField.type, "secret");
  assertEquals(apiKeyField.required, true);
});

Deno.test("api-key: sign sets the `Api-Token` header with no prefix", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://acme.api-us1.com/api/3/contacts",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiKey: "abc123" } }, ctx);
  assertEquals(out.headers["api-token"], "abc123");
  assertEquals(Object.keys(out.headers), ["api-token"]);
});

Deno.test("api-key: test GETs /contacts?limit=1 against the credential's apiUrl", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contacts: [] } }]);
  const result = await auth.test(
    { credential: { apiUrl: "https://acme.api-us1.com", apiKey: "abc123" } },
    ctx,
  );
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://acme.api-us1.com/api/3/contacts");
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(calls[0].headers["api-token"], "abc123");
});

Deno.test("api-key: test reports ok=false on a non-2xx response", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  const result = await auth.test(
    { credential: { apiUrl: "https://acme.api-us1.com", apiKey: "bad" } },
    ctx,
  );
  assertEquals(result.ok, false);
});

Deno.test("api-key: test reports ok=false when apiUrl or apiKey is missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: { apiUrl: "https://acme.api-us1.com" } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("api-key: afterConnect republishes apiUrl onto connection.display", () => {
  const out = auth.afterConnect!(
    { credential: { apiUrl: "https://acme.api-us1.com/", apiKey: "abc123" } },
    {} as never,
  );
  assertEquals(out, { apiUrl: "https://acme.api-us1.com" });
});
