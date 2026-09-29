import { assert, assertEquals } from "@std/assert";
import oauth2Methods from "../../auth/oauth2.ts";
import { REGIONS } from "../../lib/regions.ts";
import { mockCtx } from "../_helpers.ts";

const TOKEN = "1000.unitTestFixtureNotARealToken.abcdef0123456789";

function findRegion(key: string) {
  return oauth2Methods.find((m) => m.key === key)!;
}

Deno.test("oauth2: one AuthDefinition per region, each keyed and hosted correctly", () => {
  assertEquals(oauth2Methods.length, REGIONS.length);
  const keys = oauth2Methods.map((m) => m.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate auth key");
  for (const region of REGIONS) {
    const method = oauth2Methods.find((m) => m.key === `oauth2-${region.key}`);
    assert(method, `no auth method for region ${region.key}`);
    assertEquals(method!.type, "oauth2");
    assertEquals(method!.oauth2?.authorizationUrl, `https://${region.accountsHost}/oauth/v2/auth`);
    assertEquals(method!.oauth2?.tokenUrl, `https://${region.accountsHost}/oauth/v2/token`);
  }
});

/** The API host has no Canada quirk here — only the accounts host does. */
Deno.test("oauth2-ca: authorizes against accounts.zohocloud.ca, not accounts.zoho.ca", () => {
  const ca = findRegion("oauth2-ca");
  assertEquals(ca.oauth2?.authorizationUrl, "https://accounts.zohocloud.ca/oauth/v2/auth");
});

Deno.test("oauth2: every method requests the offline+consent params and the eight scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, [
      "ZohoCreator.dashboard.READ",
      "ZohoCreator.meta.application.READ",
      "ZohoCreator.meta.form.READ",
      "ZohoCreator.report.READ",
      "ZohoCreator.form.CREATE",
      "ZohoCreator.report.UPDATE",
      "ZohoCreator.report.DELETE",
      "ZohoCreator.report.CREATE",
    ]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const us = findRegion("oauth2-us");
  const request = {
    method: "GET",
    url: "https://www.zohoapis.com/creator/v2/meta/applications",
    headers: {},
  };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://www.zohoapis.com/creator/v2/meta/applications");
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when /meta/applications answers", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([{ body: { code: 3000, applications: [] } }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).pathname, "/creator/v2/meta/applications");
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([{ body: { code: 3000, applications: [] } }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.eu");
});

Deno.test("oauth2-ca: test addresses www.zohoapis.ca — the API host has no Canada quirk", async () => {
  const ca = findRegion("oauth2-ca");
  const { ctx, calls } = mockCtx([{ body: { code: 3000, applications: [] } }]);
  await ca.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.ca");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([]);
  const result = await us.test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * Zoho Creator's docs only name the one code family (1030) for an invalid/expired
 * token, unlike Zoho Analytics' two distinguishable codes — this test pins that
 * both a missing-looking and a garbage token are reported the same way.
 */
Deno.test("oauth2-us: an invalid/expired token is reported as code 1030", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      code: 1030,
      description: "Authorization Failure. The access token is either invalid or has expired.",
    },
  }]);
  const result = await us.test!({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/1030/.test(result.message ?? ""), result.message);
  assert(/reconnect/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: afterConnect records apiHost/region without any network call", () => {
  const us = findRegion("oauth2-us");
  const display = us.afterConnect!({ credential: { accessToken: TOKEN } }, {} as never);
  assertEquals(display, { apiHost: "www.zohoapis.com", region: "United States" });
});

Deno.test("oauth2-ca: afterConnect records the CA apiHost (www.zohoapis.ca)", () => {
  const ca = findRegion("oauth2-ca");
  const display = ca.afterConnect!({ credential: {} }, {} as never);
  assertEquals(display, { apiHost: "www.zohoapis.ca", region: "Canada" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
  }
});
