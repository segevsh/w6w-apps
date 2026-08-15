import { assert, assertEquals } from "@std/assert";
import oauth2Methods from "../../auth/oauth2.ts";
import { REGIONS } from "../../lib/regions.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "1000.unitTestFixtureNotARealToken.abcdef0123456789";

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

Deno.test("oauth2: every method requests the offline+consent params and the four scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, [
      "ZohoMail.accounts.READ",
      "ZohoMail.folders.ALL",
      "ZohoMail.messages.ALL",
      "ZohoMail.tags.ALL",
    ]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const [us] = oauth2Methods;
  const request = { method: "GET", url: "https://mail.zoho.com/api/accounts", headers: {} };
  const signed = us.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://mail.zoho.com/api/accounts");
  assert(!signed.url.includes(TOKEN));
});

function findRegion(key: string) {
  const method = oauth2Methods.find((m) => m.key === key)!;
  return method;
}

Deno.test("oauth2-us: test passes when /api/accounts answers", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([{ body: envelope([{ accountId: "1" }]) }]);
  const result = await us.test({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/api/accounts");
  assertEquals(new URL(calls[0].url).host, "mail.zoho.com");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const eu = findRegion("oauth2-eu");
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await eu.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "mail.zoho.eu");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([]);
  const result = await us.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/**
 * The two documented error codes are two different problems: no usable token
 * reached the request at all (`INVALID_TICKET`) versus a token that reached
 * it but was rejected (`INVALID_OAUTHTOKEN`). Collapsing them into one bare
 * 4xx message is how "the token expired" gets misreported as "no credential
 * configured", or vice versa.
 */
Deno.test("oauth2-us: a missing/unsigned request is reported as INVALID_TICKET", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 400, body: errorBody("INVALID_TICKET", "Invalid ticket") }]);
  const result = await us.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/INVALID_TICKET/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a dead token is reported as INVALID_OAUTHTOKEN", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 401, body: errorBody("INVALID_OAUTHTOKEN") }]);
  const result = await us.test({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/INVALID_OAUTHTOKEN/.test(result.message ?? ""), result.message);
  assert(/rejected/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 500 is reported as an HTTP failure, not a credential problem", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await us.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/HTTP 500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: afterConnect records apiHost/region even when it cannot reach the API", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([]);
  const display = await us.afterConnect!({ credential: {} }, ctx);
  assertEquals(display, { apiHost: "mail.zoho.com", region: "United States" });
});

Deno.test("oauth2-us: afterConnect records the primary account's id and address", async () => {
  const us = findRegion("oauth2-us");
  const { ctx, calls } = mockCtx([
    {
      body: envelope([
        {
          accountId: "2560636000000008002",
          primaryEmailAddress: "rebecca@zylker.com",
          displayName: "Rebecca",
        },
      ]),
    },
  ]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/accounts");
  assertEquals(display, {
    apiHost: "mail.zoho.com",
    region: "United States",
    accountId: "2560636000000008002",
    primaryEmailAddress: "rebecca@zylker.com",
    displayName: "Rebecca",
  });
});

Deno.test("oauth2-us: afterConnect stays on the base display when the whoami fails", async () => {
  const us = findRegion("oauth2-us");
  const { ctx } = mockCtx([{ status: 401, body: errorBody("INVALID_OAUTHTOKEN") }]);
  const display = await us.afterConnect!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(display, { apiHost: "mail.zoho.com", region: "United States" });
});

Deno.test("oauth2: every method declares both required hooks", () => {
  for (const method of oauth2Methods) {
    assertEquals(typeof method.test, "function");
    assertEquals(typeof method.sign, "function");
  }
});
