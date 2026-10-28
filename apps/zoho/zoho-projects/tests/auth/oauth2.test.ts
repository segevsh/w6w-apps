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
  assert(SCOPES.every((s) => s.startsWith("ZohoProjects.")));
});

Deno.test("oauth2: Canada uses the zohocloud.ca hosts", () => {
  const ca = oauth2Methods.find((m) => m.key === "oauth2-ca")!;
  assertEquals(ca.oauth2?.tokenUrl, "https://accounts.zohocloud.ca/oauth/v2/token");
  assertEquals(REGIONS.find((r) => r.key === "ca")!.apiHost, "projects.zohocloud.ca");
});

Deno.test("oauth2: sign stamps Bearer and leaves the URL alone", () => {
  const signed = us.sign!({
    request: { method: "GET", url: "https://projects.zoho.com/api/v3/portals", headers: {} },
    credential: { accessToken: TOKEN },
  }, {} as never) as { url: string; headers: Record<string, string> };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2: test passes on a 200 from /api/v3/portals", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: "1", portal_name: "zylker" }] }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, true);
  assertEquals(calls[0].url, "https://projects.zoho.com/api/v3/portals");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: test uses the region's own host", async () => {
  const eu = oauth2Methods.find((m) => m.key === "oauth2-eu")!;
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await eu.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(new URL(calls[0].url).host, "projects.zoho.eu");
});

Deno.test("oauth2: test classifies a rejected token by the vendor's error title", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      error: {
        title: "INVALID_OAUTHTOKEN",
        details: [{ message: "Invalid OAuth access token." }],
      },
    },
  }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("INVALID_OAUTHTOKEN"));
  assert(!r.message?.includes(TOKEN));
});

Deno.test("oauth2: test classifies from the BODY — INVALID_TICKET is a rejection whatever the status", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { error: { title: "INVALID_TICKET" } },
  }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rejected"));
});

Deno.test("oauth2: test reports a scope problem distinctly", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { title: "OAUTH_SCOPE_MISMATCH", details: [{ message: "scope" }] } },
  }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("scope"));
});

Deno.test("oauth2: test reports an unrecognised failure with its status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "<html>down</html>" }]);
  const r = await us.test!({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("HTTP 503"));
});

Deno.test("oauth2: test fails fast without a token", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await us.test!({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect records the region's API host", () => {
  const eu = oauth2Methods.find((m) => m.key === "oauth2-eu")!;
  assertEquals((eu.afterConnect as () => unknown)(), {
    apiHost: "projects.zoho.eu",
    region: "Europe",
  });
});
