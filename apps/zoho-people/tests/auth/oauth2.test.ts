import { assert, assertEquals } from "@std/assert";
import oauth2Methods from "../../auth/oauth2.ts";
import { REGIONS } from "../../lib/regions.ts";
import { mockCtx } from "../_helpers.ts";

const TOKEN = "1000.unitTestFixtureNotARealToken.abcdef0123456789";
const find = (key: string) => oauth2Methods.find((m) => m.key === key)!;

Deno.test("oauth2: one AuthDefinition per region, each keyed and hosted correctly", () => {
  assertEquals(oauth2Methods.length, REGIONS.length);
  for (const region of REGIONS) {
    const method = find(`oauth2-${region.key}`);
    assert(method, `no auth method for region ${region.key}`);
    assertEquals(method.type, "oauth2");
    assertEquals(method.oauth2?.authorizationUrl, `https://${region.accountsHost}/oauth/v2/auth`);
    assertEquals(method.oauth2?.tokenUrl, `https://${region.accountsHost}/oauth/v2/token`);
  }
});

Deno.test("oauth2-ca: authorizes against accounts.zohocloud.ca, not accounts.zoho.ca", () => {
  assertEquals(
    find("oauth2-ca").oauth2?.authorizationUrl,
    "https://accounts.zohocloud.ca/oauth/v2/auth",
  );
  assertEquals(REGIONS.find((r) => r.key === "ca")!.apiHost, "people.zohocloud.ca");
});

Deno.test("oauth2: every method requests offline+consent and the four ZOHOPEOPLE scopes", () => {
  for (const method of oauth2Methods) {
    assertEquals(method.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(method.oauth2?.scopes, [
      "ZOHOPEOPLE.forms.ALL",
      "ZOHOPEOPLE.leave.ALL",
      "ZOHOPEOPLE.attendance.ALL",
      "ZOHOPEOPLE.timetracker.ALL",
    ]);
  }
});

Deno.test("oauth2-us: sign stamps the Zoho-oauthtoken header and nothing else", () => {
  const request = { method: "GET", url: "https://people.zoho.com/people/api/forms", headers: {} };
  const signed = find("oauth2-us").sign!(
    { request, credential: { accessToken: TOKEN } },
    {} as never,
  ) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assertEquals(signed.url, "https://people.zoho.com/people/api/forms");
});

Deno.test("oauth2-us: test passes when the forms list answers ok", async () => {
  const { ctx, calls } = mockCtx([{ body: { response: { result: [], status: 0 } } }]);
  const result = await find("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(new URL(calls[0].url).host, "people.zoho.com");
  assertEquals(new URL(calls[0].url).pathname, "/people/api/forms");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2-eu: test addresses the EU API host", async () => {
  const { ctx, calls } = mockCtx([{ body: { response: { result: [], status: 0 } } }]);
  await find("oauth2-eu").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "people.zoho.eu");
});

Deno.test("oauth2-us: test fails with no token, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await find("oauth2-us").test!({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

/** Measured live: a dead token is HTTP 401 / 7213; the vendor's code is what gets reported. */
Deno.test("oauth2-us: a dead token is reported with the vendor's 7213 code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      response: {
        message: "Error occurred",
        errors: { code: 7213, message: "The provided OAuth token is invalid." },
        status: 1,
      },
    },
  }]);
  const result = await find("oauth2-us").test!({ credential: { accessToken: "garbage" } }, ctx);
  assertEquals(result.ok, false);
  assert(/7213/.test(result.message ?? ""), result.message);
});

/** Measured live: a blank/missing header is HTTP 400 / 7202 — a 400 is still a credential failure here. */
Deno.test("oauth2-us: a 400 with code 7202 is reported as a credential failure", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      response: {
        errors: { code: 7202, message: "Provided authentication token is invalid." },
        status: 1,
      },
    },
  }]);
  const result = await find("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/7202/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-us: a 2xx carrying an error code in the body is NOT ok", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { response: { errors: { code: 7213, message: "bad" }, status: 1 } },
  }]);
  const result = await find("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
});

Deno.test("oauth2-us: a 500 is reported as an HTTP failure", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await find("oauth2-us").test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect records each region's fixed apiHost and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const display = await find("oauth2-eu").afterConnect!(
    { credential: { accessToken: TOKEN } },
    ctx,
  );
  assertEquals(display, { apiHost: "people.zoho.eu", region: "Europe", fullName: "Europe" });
  assertEquals(calls.length, 0);
});
