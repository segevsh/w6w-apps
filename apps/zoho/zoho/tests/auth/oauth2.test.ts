import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

test("oauth2: US data centre endpoints, offline access so a refresh token comes back", () => {
  assertEquals(auth.oauth2?.authorizationUrl, "https://accounts.zoho.com/oauth/v2/auth");
  assertEquals(auth.oauth2?.tokenUrl, "https://accounts.zoho.com/oauth/v2/token");
  assertEquals(auth.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
  assert(auth.oauth2?.scopes?.includes("ZohoCRM.modules.ALL"));
  assert(auth.oauth2?.scopes?.includes("ZohoCRM.org.READ"));
});

test("sign: stamps Zoho's own auth scheme, not a bare Bearer", async () => {
  const request = {
    url: "https://www.zohoapis.com/crm/v6/Leads",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "t" } }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], "Zoho-oauthtoken t");
});

test("test: fails fast when the credential carries no access token", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
});

test("test: probes GET /crm/v6/org on the recorded api_domain", async () => {
  const { ctx, calls } = mockCtx([{ body: { org: [{ id: "1", company_name: "Acme" }] } }]);
  const result = await auth.test(
    { credential: { accessToken: "t", apiDomain: "https://www.zohoapis.com" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://www.zohoapis.com/crm/v6/org");
  assertEquals(calls[0].headers["authorization"], "Zoho-oauthtoken t");
});

test("test: accepts either spelling of the api domain field", async () => {
  const { ctx } = mockCtx([{ body: { org: [{ id: "1" }] } }]);
  assertEquals(
    await auth.test(
      { credential: { accessToken: "t", api_domain: "https://www.zohoapis.com" } },
      ctx,
    ),
    { ok: true },
  );
});

test("test: reports a non-2xx as a failed credential", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  assertEquals(
    await auth.test(
      { credential: { accessToken: "bad", apiDomain: "https://www.zohoapis.com" } },
      ctx,
    ),
    { ok: false, message: "Zoho CRM returned 401" },
  );
});

test("afterConnect: lifts api_domain and the org name onto the connection", async () => {
  const { ctx, calls } = mockCtx([{ body: { org: [{ id: "org1", company_name: "Acme Inc" }] } }]);
  const out = await auth.afterConnect!(
    { credential: { api_domain: "https://www.zohoapis.com" } },
    ctx,
  );
  assertEquals(out.apiDomain, "https://www.zohoapis.com");
  assertEquals(out.org, { id: "org1", name: "Acme Inc" });
  assertEquals(calls[0].url, "https://www.zohoapis.com/crm/v6/org");
});

test("afterConnect: still records the api domain if /org fails", async () => {
  const { ctx } = mockCtx([{ status: 401, body: {} }]);
  const out = await auth.afterConnect!(
    { credential: { apiDomain: "https://www.zohoapis.com" } },
    ctx,
  );
  assertEquals(out, { apiDomain: "https://www.zohoapis.com" });
});

test("afterConnect: no-ops when the credential carries no api domain at all", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "t" } }, ctx), {});
});
