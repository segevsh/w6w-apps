import { assert, assertEquals } from "@std/assert";
import oauth2Methods, { SCOPES } from "../../auth/oauth2.ts";
import { REGIONS } from "../../lib/regions.ts";
import { mockCtx } from "../_helpers.ts";

const TOKEN = "1000.unitTestFixtureNotARealToken.abcdef0123456789";

function findRegion(key: string) {
  return oauth2Methods.find((m) => m.key === key)!;
}

Deno.test("oauth2: one AuthDefinition per region, each keyed and hosted correctly", () => {
  assertEquals(oauth2Methods.length, 9);
  assertEquals(oauth2Methods.length, REGIONS.length);
  const keys = oauth2Methods.map((m) => m.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate auth key");
  for (const region of REGIONS) {
    const method = findRegion(`oauth2-${region.key}`);
    assert(method, `no auth method for region ${region.key}`);
    assertEquals(method.type, "oauth2");
    assertEquals(method.oauth2?.authorizationUrl, `https://${region.accountsHost}/oauth/v2/auth`);
    assertEquals(method.oauth2?.tokenUrl, `https://${region.accountsHost}/oauth/v2/token`);
    assertEquals(method.oauth2?.refreshUrl, `https://${region.accountsHost}/oauth/v2/token`);
  }
});

Deno.test("oauth2-ca: authorizes against accounts.zohocloud.ca, not accounts.zoho.ca", () => {
  assertEquals(
    findRegion("oauth2-ca").oauth2?.authorizationUrl,
    "https://accounts.zohocloud.ca/oauth/v2/auth",
  );
});

Deno.test("oauth2-uk: the UK data centre is present", () => {
  assertEquals(findRegion("oauth2-uk").oauth2?.tokenUrl, "https://accounts.zoho.uk/oauth/v2/token");
});

Deno.test("oauth2: every method requests offline+consent and the documented Cliq scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, SCOPES);
  }
  assert(SCOPES.includes("ZohoCliq.Webhooks.CREATE"), "posting needs the Webhooks scope");
  assert(SCOPES.every((s) => s.startsWith("ZohoCliq.")));
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and leaves the URL alone", () => {
  const request = { method: "GET", url: "https://cliq.zoho.com/api/v2/channels", headers: {} };
  const signed = findRegion("oauth2-us").sign!(
    { request, credential: { accessToken: TOKEN } },
    {} as never,
  ) as { url: string; headers: Record<string, string> };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2-us: test passes when /channels answers, signed, against the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { channels: [] } }]);
  const result = await findRegion("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/channels");
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-ca: test addresses cliq.zohocloud.ca", async () => {
  const { ctx, calls } = mockCtx([{ body: { channels: [] } }]);
  await findRegion("oauth2-ca").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "cliq.zohocloud.ca");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await findRegion("oauth2-us").test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2-us: a dead token is reported with the vendor's own code and message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "oauthtoken_invalid", message: "Invalid OAuth token passed." },
  }]);
  const result = await findRegion("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/oauthtoken_invalid/.test(result.message ?? ""), result.message);
  assert(/Invalid OAuth token/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: the blank two-byte 401 Cliq sends for a missing token is a rejection, not a crash", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: "\n\n",
    headers: { "content-type": "text/html" },
  }]);
  const result = await findRegion("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 401/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: the credential never appears in a failure message", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await findRegion("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assert(!(result.message ?? "").includes(TOKEN));
});

Deno.test("oauth2: afterConnect records each region's apiHost", async () => {
  for (const region of REGIONS) {
    const display = await findRegion(`oauth2-${region.key}`).afterConnect!(
      { credential: { accessToken: TOKEN } },
      {} as never,
    );
    assertEquals(display, { apiHost: region.apiHost, region: region.label });
  }
});
