import { assert, assertEquals } from "@std/assert";

import apiKey, { classifyTokenCheck, TOKEN_CHECK_PATH } from "../../auth/api-key.ts";
import { API_ROOT, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** Not a real credential — shaped like one only so a leak would be visible. */
const TOKEN = "unitTestFixtureTokenThatIsNotReal0000";

Deno.test("api-key: the probe is GET /token/check", () => {
  assertEquals(TOKEN_CHECK_PATH, "/token/check");
});

Deno.test("api-key: sign appends token to a URL that already carries filters", () => {
  const request = {
    method: "GET",
    url: `${API_ROOT}/contacts?limit=20&page=2`,
    headers: {} as Record<string, string>,
  };

  const signed = apiKey.sign!({ request, credential: { apiKey: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(queryOf(signed.url), { limit: "20", page: "2", token: TOKEN });
  assertEquals(pathOf(signed.url), "/api/v1/contacts");
  assertEquals(signed.headers, {});
});

Deno.test("api-key: the credential config is the vendor's own scheme", () => {
  assertEquals(apiKey.key, "api-key");
  assertEquals(apiKey.type, "apiKey");
  assertEquals(apiKey.apiKey, { in: "query", name: "token" });
  assertEquals(apiKey.fields?.length, 1);
  assertEquals(apiKey.fields?.[0].key, "apiKey");
  assertEquals(apiKey.fields?.[0].type, "secret");
  assertEquals(apiKey.fields?.[0].required, true);
});

Deno.test("api-key: test calls /token/check with the token in the query string", async () => {
  const { ctx, calls } = mockCtx([
    { body: { email: "ada@example.com", name: "Ada", organization: "Acme" } },
  ]);

  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/v1/token/check");
  assertEquals(queryOf(calls[0].url), { token: TOKEN });
});

Deno.test("api-key: a refusal is reported without echoing the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Permission denied." } }]);

  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/refused the token/i.test(result.message ?? ""), result.message);
  assert(!(result.message ?? "").includes(TOKEN), "the message must not carry the credential");
});

Deno.test("api-key: a 200 without the documented email field is not a live token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { ok: true } }]);

  const result = await apiKey.test({ credential: { apiKey: TOKEN } }, ctx);

  assertEquals(result.ok, false);
  assert(/email/.test(result.message ?? ""), result.message);
});

Deno.test("api-key: no token means no request at all", async () => {
  const { ctx, calls } = mockCtx([]);

  const result = await apiKey.test({ credential: {} }, ctx);

  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-key: the classification is body-driven, per the vendor's shapes", () => {
  assertEquals(classifyTokenCheck(200, { email: "ada@example.com" }), { ok: true });
  assertEquals(classifyTokenCheck(200, {}).ok, false);
  assertEquals(classifyTokenCheck(200, undefined).ok, false);
  assertEquals(
    classifyTokenCheck(401, { error: "Permission denied." }).message,
    "RD Station CRM refused the token: Permission denied.",
  );
  assertEquals(classifyTokenCheck(500, undefined).ok, false);
});
