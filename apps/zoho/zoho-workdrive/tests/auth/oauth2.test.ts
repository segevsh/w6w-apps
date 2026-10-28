import { assert, assertEquals } from "@std/assert";
import oauth2Methods, { SCOPES } from "../../auth/oauth2.ts";
import { REGIONS } from "../../lib/regions.ts";
import { mockCtx } from "../_helpers.ts";

const TOKEN = "1000.unitTestFixtureNotARealToken.abcdef0123456789";
const us = oauth2Methods.find((m) => m.key === "oauth2-us")!;

Deno.test("oauth2: one method per region, hosted on that region's accounts server", () => {
  assertEquals(oauth2Methods.length, REGIONS.length);
  assertEquals(new Set(oauth2Methods.map((m) => m.key)).size, REGIONS.length);
  for (const r of REGIONS) {
    const m = oauth2Methods.find((x) => x.key === `oauth2-${r.key}`)!;
    assertEquals(m.type, "oauth2");
    assertEquals(m.oauth2?.authorizationUrl, `https://${r.accountsHost}/oauth/v2/auth`);
    assertEquals(m.oauth2?.tokenUrl, `https://${r.accountsHost}/oauth/v2/token`);
    assertEquals(m.oauth2?.extraAuthParams, { access_type: "offline", prompt: "consent" });
    assertEquals(m.oauth2?.scopes, SCOPES);
  }
});

Deno.test("oauth2: Canada uses the zohocloud.ca accounts host", () => {
  const ca = oauth2Methods.find((m) => m.key === "oauth2-ca")!;
  assertEquals(ca.oauth2?.tokenUrl, "https://accounts.zohocloud.ca/oauth/v2/token");
});

Deno.test("oauth2: sign stamps Zoho-oauthtoken and leaves the URL alone", () => {
  const signed = us.sign!({
    request: {
      method: "GET",
      url: "https://www.zohoapis.com/workdrive/api/v1/users/me",
      headers: {},
    },
    credential: { accessToken: TOKEN },
  }, {} as never) as { url: string; headers: Record<string, string> };
  assertEquals(signed.headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2: test passes on a 200 from /users/me", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", type: "users" } } }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, true);
  assertEquals(calls[0].url, "https://www.zohoapis.com/workdrive/api/v1/users/me");
  assertEquals(calls[0].headers.authorization, `Zoho-oauthtoken ${TOKEN}`);
});

Deno.test("oauth2: test uses the region's own host", async () => {
  const eu = oauth2Methods.find((m) => m.key === "oauth2-eu")!;
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.eu");
});

Deno.test("oauth2: test classifies a rejected token by the vendor's error id", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ id: "F7003", title: "Invalid OAuth token." }] },
  }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("F7003"));
});

Deno.test("oauth2: test classifies from the BODY — a 500 INVALID_TICKET is a rejection", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { errors: [{ id: "F000", title: "INVALID_TICKET" }] },
  }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rejected"));
});

Deno.test("oauth2: test reports a missing scope distinctly", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ id: "F7004", title: "Invalid OAuth scope." }] },
  }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("scope"));
});

Deno.test("oauth2: test fails on an unclassifiable error and on a missing token", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "gateway down" }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("503"));
  const none = await us.test!({ credential: {} }, mockCtx([]).ctx);
  assertEquals(none.ok, false);
});

Deno.test("oauth2: afterConnect records the region's API host", async () => {
  const au = oauth2Methods.find((m) => m.key === "oauth2-au")!;
  const out = await au.afterConnect!({ credential: {} } as never, mockCtx([]).ctx);
  assertEquals((out as { apiHost: string }).apiHost, "www.zohoapis.com.au");
});
