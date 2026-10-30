import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import clientAuth from "../../auth/oauth-client.ts";
import adminAuth from "../../auth/organization-token.ts";
import patAuth from "../../auth/personal-access-token.ts";
import oauth from "../../auth/oauth2.ts";
import { NotionClient } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

test("OAuth Client signs token endpoints with Basic authentication", () => {
  for (const endpoint of ["token", "introspect", "revoke"]) {
    const request = {
      url: `https://api.notion.com/v1/oauth/${endpoint}`,
      method: "POST",
      headers: {},
    };
    const signed = clientAuth.sign!({
      request,
      credential: { clientId: "id", clientSecret: "secret" },
    });
    assertEquals(signed, {
      ...request,
      headers: { authorization: `Basic ${btoa("id:secret")}`, "Notion-Version": "2026-03-11" },
    });
  }
});

test("OAuth Client cannot sign content requests", () => {
  assertThrows(
    () =>
      clientAuth.sign!({
        request: { url: "https://api.notion.com/v1/pages", method: "POST", headers: {} },
        credential: {},
      }),
    Error,
    "only support token management",
  );
});

test("Enterprise Admin uses its independent API version and rejects content requests", () => {
  const request = {
    url: "https://api.notion.com/admin/v1/legal_holds",
    method: "GET",
    headers: {},
  };
  assertEquals(adminAuth.sign!({ request, credential: { apiKey: "admin-token" } }), {
    ...request,
    headers: { authorization: "Bearer admin-token", "Notion-Version": "2026-06-01" },
  });
  assertThrows(
    () =>
      adminAuth.sign!({
        request: { ...request, url: "https://api.notion.com/v1/users" },
        credential: {},
      }),
    Error,
    "Organization tokens",
  );
});

test("Admin and OAuth Client checks disclose local validation and reject missing fields", () => {
  assertEquals(adminAuth.test({ credential: {} }).ok, false);
  assertEquals(clientAuth.test({ credential: { clientId: "id" } }).ok, false);
  const checked = adminAuth.test({ credential: { apiKey: "token" } });
  assertEquals(checked.ok, true);
  assertEquals(checked.message.includes("local check"), true);
});

test("Personal access tokens share bearer signing and the real users/me credential probe", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "bot" } }]);
  assertEquals(await patAuth.test({ credential: { apiKey: "pat" } }, ctx), { ok: true });
  assertEquals(calls[0].headers.authorization, "Bearer pat");
  assertEquals(new URL(calls[0].url).pathname, "/v1/users/me");
});

test("Browser OAuth declares the Notion-specific token exchange and user consent settings", () => {
  assertEquals(oauth.oauth2?.tokenAuthMethod, "client_secret_basic");
  assertEquals(oauth.oauth2?.tokenBodyFormat, "json");
  assertEquals(oauth.oauth2?.extraAuthParams, { owner: "user" });
});

test("Client refuses incompatible connections before sending Admin or OAuth requests", async () => {
  const { ctx, calls } = mockCtx();
  ctx.connection = {
    id: "c",
    app: "io.w6w.notion",
    auth: "internal-secret",
    owner: "u",
    state: "connected",
    createdAt: "2026-10-19",
  };
  const client = new NotionClient(ctx);
  await assertRejects(
    () => client.request("/legal_holds", { admin: true }),
    Error,
    "Organization Bot Token",
  );
  await assertRejects(
    () => client.request("/oauth/introspect", { method: "POST", body: { token: "t" } }),
    Error,
    "OAuth Client",
  );
  assertEquals(calls.length, 0);
});
