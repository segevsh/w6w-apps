import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import production from "../../auth/oauth2.ts";
import sandbox from "../../auth/oauth2-sandbox.ts";

const req = (url: string, headers: Record<string, string> = {}) => ({
  url,
  method: "GET" as const,
  headers,
});

Deno.test("oauth2: production endpoints", () => {
  assertEquals(production.key, "oauth2");
  assertEquals(production.oauth2?.authorizationUrl, "https://login.procore.com/oauth/authorize");
  assertEquals(production.oauth2?.tokenUrl, "https://login.procore.com/oauth/token");
  assertEquals(production.oauth2?.refreshUrl, "https://login.procore.com/oauth/token");
});

Deno.test("oauth2-sandbox: sandbox endpoints", () => {
  assertEquals(sandbox.key, "oauth2-sandbox");
  assertEquals(
    sandbox.oauth2?.authorizationUrl,
    "https://login-sandbox.procore.com/oauth/authorize",
  );
  assertEquals(sandbox.oauth2?.tokenUrl, "https://login-sandbox.procore.com/oauth/token");
});

Deno.test("oauth2: sign adds Bearer and the connection's company header", async () => {
  const { ctx } = mockCtx();
  const out = await production.sign!({
    request: req("https://api.procore.com/rest/v1.0/projects"),
    credential: { accessToken: "tok", companyId: 123 },
  }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
  assertEquals(out.headers["Procore-Company-Id"], "123");
});

Deno.test("oauth2: sign keeps an explicit company header and skips me/companies", async () => {
  const { ctx } = mockCtx();
  const explicit = await production.sign!({
    request: req("https://api.procore.com/rest/v1.0/projects", { "procore-company-id": "5" }),
    credential: { accessToken: "tok", companyId: 123 },
  }, ctx);
  assertEquals(explicit.headers["procore-company-id"], "5");
  assertEquals(explicit.headers["Procore-Company-Id"], undefined);

  for (const path of ["/rest/v1.0/me", "/rest/v1.0/companies"]) {
    const out = await production.sign!({
      request: req(`https://api.procore.com${path}`),
      credential: { accessToken: "tok", companyId: 123 },
    }, ctx);
    assertEquals(out.headers["Procore-Company-Id"], undefined, path);
  }
});

Deno.test("oauth2: sign without a company id adds only the token", async () => {
  const { ctx } = mockCtx();
  const out = await production.sign!({
    request: req("https://api.procore.com/rest/v1.0/projects"),
    credential: { accessToken: "tok" },
  }, ctx);
  assertEquals(Object.keys(out.headers), ["authorization"]);
});

Deno.test("oauth2: test with no accessToken makes no request", async () => {
  const { ctx, calls } = mockCtx();
  const r = await production.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test passes on a /me body with a numeric id", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, login: "a@b.co", name: "A" } }]);
  const r = await production.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(r, { ok: true });
  assertEquals(calls[0].url, "https://api.procore.com/rest/v1.0/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2-sandbox: test hits the sandbox host", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await sandbox.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(calls[0].url, "https://sandbox.procore.com/rest/v1.0/me");
});

Deno.test("oauth2: test fails on Procore's error body, quoting it, whatever the status", async () => {
  const bad = mockCtx([{ status: 401, body: { errors: "Your access token has expired" } }]);
  const r = await production.test({ credential: { accessToken: "tok" } }, bad.ctx);
  assertEquals(r.ok, false);
  assert((r.message ?? "").includes("expired"));
  assert((r.message ?? "").includes("401"));

  // A 200 whose body is not a /me object is not a pass either (SPA/edge shell).
  const shell = mockCtx([{ status: 200, body: "<html></html>" }]);
  const r2 = await production.test({ credential: { accessToken: "tok" } }, shell.ctx);
  assertEquals(r2.ok, false);
});

Deno.test("oauth2: afterConnect records environment, host, user and company name", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: 9, login: "a@b.co", name: "Ada" } },
    { body: [{ id: 1, name: "Other" }, { id: 123, name: "Acme Builders" }] },
  ]);
  const out = await production.afterConnect!(
    { credential: { accessToken: "tok", companyId: "123" } },
    ctx,
  );
  assertEquals(out, {
    environment: "production",
    apiBase: "https://api.procore.com",
    user: { id: 9, name: "Ada", email: "a@b.co" },
    companyId: 123,
    companyName: "Acme Builders",
  });
  assertEquals(calls[1].url, "https://api.procore.com/rest/v1.0/companies");
  assertEquals(calls[1].headers["procore-company-id"], undefined);
});

Deno.test("oauth2-sandbox: afterConnect without a company records the sandbox host", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 9, login: "a@b.co", name: "Ada" } }]);
  const out = await sandbox.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(out.environment, "sandbox");
  assertEquals(out.apiBase, "https://sandbox.procore.com");
  assertEquals(out.companyId, undefined);
  assertEquals(out.companyName, "no default company");
});
