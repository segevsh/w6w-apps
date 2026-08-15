import { assert, assertEquals } from "@std/assert";
import apiKey, { authHeaders, normalizeSubdomain, PROBE_PATH } from "../../auth/api-key.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("normalizeSubdomain: strips scheme, host suffix and trailing path", () => {
  assertEquals(normalizeSubdomain("my-site"), "my-site");
  assertEquals(normalizeSubdomain("https://my-site.thinkific.com/"), "my-site");
  assertEquals(normalizeSubdomain("my-site.thinkific.com/manage"), "my-site");
  assertEquals(normalizeSubdomain(undefined), "");
});

Deno.test("authHeaders: builds both headers, lower-cased", () => {
  const headers = authHeaders({ apiKey: "k", subdomain: "acme" });
  assertEquals(headers["x-auth-api-key"], "k");
  assertEquals(headers["x-auth-subdomain"], "acme");
});

Deno.test("sign: stamps both headers and never touches the URL", () => {
  const request = {
    url: "https://api.thinkific.com/api/public/v1/courses",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const signed = apiKey.sign!(
    { request, credential: { apiKey: "secret-key", subdomain: "acme" } },
    mockCtx().ctx,
  ) as typeof request;
  assertEquals(signed.headers["x-auth-api-key"], "secret-key");
  assertEquals(signed.headers["x-auth-subdomain"], "acme");
  assert(!signed.url.includes("secret-key"), "credential leaked into the URL");
});

Deno.test("test: probes GET /courses?limit=1, exactly the vendor's own documented smoke test", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { items: [], meta: {} } }]);
  const result = await apiKey.test({ credential: { apiKey: "k", subdomain: "acme" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/public/v1" + PROBE_PATH);
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(calls[0].headers["x-auth-api-key"], "k");
  assertEquals(calls[0].headers["x-auth-subdomain"], "acme");
});

Deno.test("test: missing apiKey/subdomain fails locally without a fetch", async () => {
  const { ctx: ctx1, calls: calls1 } = mockCtx([]);
  const r1 = await apiKey.test({ credential: { subdomain: "acme" } }, ctx1);
  assertEquals(r1.ok, false);
  assertEquals(calls1.length, 0);

  const { ctx: ctx2, calls: calls2 } = mockCtx([]);
  const r2 = await apiKey.test({ credential: { apiKey: "k" } }, ctx2);
  assertEquals(r2.ok, false);
  assertEquals(calls2.length, 0);
});

Deno.test("test: 401 explains the credential-vs-plan ambiguity, not just 'invalid'", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("Authentication Error") }]);
  const result = await apiKey.test({ credential: { apiKey: "bad", subdomain: "acme" } }, ctx);
  assertEquals(result.ok, false);
  assert(/plan does not include API access/.test(result.message ?? ""));
});

Deno.test("test: 403 is reported as a plan/Apps-availability failure, not a scope error", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: errorBody("Access to Apps is not available on your plan. Upgrade to gain access"),
    },
  ]);
  const result = await apiKey.test({ credential: { apiKey: "k", subdomain: "acme" } }, ctx);
  assertEquals(result.ok, false);
  assert(/not available on this Site's plan/.test(result.message ?? ""));
});

Deno.test("afterConnect: republishes only the normalized subdomain, makes no network call", () => {
  const out = apiKey.afterConnect!({
    credential: { apiKey: "k", subdomain: "https://acme.thinkific.com" },
  }, mockCtx().ctx);
  assertEquals(out, { subdomain: "acme" });
});

Deno.test("the credential field is declared secret; subdomain is not", () => {
  const apiKeyField = apiKey.fields!.find((f) => f.key === "apiKey")!;
  const subdomainField = apiKey.fields!.find((f) => f.key === "subdomain")!;
  assertEquals(apiKeyField.type, "secret");
  assertEquals(subdomainField.type, "string");
});
