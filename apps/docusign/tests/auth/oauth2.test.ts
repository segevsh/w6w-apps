import { assertEquals, assertRejects } from "@std/assert";
import type { SignableRequest } from "@w6w/types";
import prodAuth, { createDocusignOAuth } from "../../auth/oauth2.ts";
import demoAuth from "../../auth/oauth2-demo.ts";
import { mockCtx } from "../_helpers.ts";

const USERINFO = {
  sub: "u-1",
  name: "First Last",
  email: "first@example.com",
  accounts: [
    {
      account_id: "eu-acct",
      account_name: "Example Europe Ltd",
      base_uri: "https://eu.docusign.net",
      is_default: false,
    },
    {
      account_id: "na-acct",
      account_name: "Example Corporation",
      base_uri: "https://na3.docusign.net",
      is_default: true,
    },
  ],
};

const req = (): SignableRequest => ({
  url: "https://na3.docusign.net/restapi/v2.1/accounts/na-acct/envelopes",
  method: "GET",
  headers: {},
});

// ------------------------------------------------------------- declarations --

Deno.test("production auth declares Docusign's confidential authorization-code endpoints", () => {
  assertEquals(prodAuth.key, "oauth2");
  assertEquals(prodAuth.type, "oauth2");
  assertEquals(prodAuth.oauth2?.authorizationUrl, "https://account.docusign.com/oauth/auth");
  assertEquals(prodAuth.oauth2?.tokenUrl, "https://account.docusign.com/oauth/token");
  // Refresh reuses the token endpoint with grant_type=refresh_token.
  assertEquals(prodAuth.oauth2?.refreshUrl, prodAuth.oauth2?.tokenUrl);
  assertEquals(prodAuth.oauth2?.scopes, ["signature", "extended"]);
  assertEquals(prodAuth.oauth2?.pkce, true);
});

Deno.test("demo auth is the same flow against the developer environment", () => {
  assertEquals(demoAuth.key, "oauth2-demo");
  assertEquals(demoAuth.oauth2?.authorizationUrl, "https://account-d.docusign.com/oauth/auth");
  assertEquals(demoAuth.oauth2?.tokenUrl, "https://account-d.docusign.com/oauth/token");
  assertEquals(demoAuth.oauth2?.scopes, prodAuth.oauth2?.scopes);
});

Deno.test("no revokeUrl is claimed — Docusign's /logout is a browser SSO logout", () => {
  assertEquals(prodAuth.oauth2?.revokeUrl, undefined);
  assertEquals(demoAuth.oauth2?.revokeUrl, undefined);
});

Deno.test("the only connect-time field is an optional account id", () => {
  assertEquals(prodAuth.fields?.length, 1);
  assertEquals(prodAuth.fields?.[0].key, "accountId");
  assertEquals(prodAuth.fields?.[0].required, undefined);
  assertEquals(prodAuth.fields?.[0].type, "string");
});

// --------------------------------------------------------------------- sign --

Deno.test("sign stamps the bearer token and touches nothing else", () => {
  const request = req();
  const out = prodAuth.sign!({ request, credential: { accessToken: "tok-123" } }, mockCtx().ctx);
  assertEquals((out as SignableRequest).headers["authorization"], "Bearer tok-123");
  assertEquals((out as SignableRequest).url, request.url);
  assertEquals((out as SignableRequest).method, "GET");
});

// --------------------------------------------------------------------- test --

Deno.test("test calls the production userinfo endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: USERINFO }]);
  assertEquals(await prodAuth.test({ credential: { accessToken: "t" } }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://account.docusign.com/oauth/userinfo");
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("test calls the demo userinfo endpoint for a demo connection", async () => {
  const { ctx, calls } = mockCtx([{ body: USERINFO }]);
  await demoAuth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(calls[0].url, "https://account-d.docusign.com/oauth/userinfo");
});

Deno.test("test reports a missing token without touching the network", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await prodAuth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential has no accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("test reports a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "invalid_token" } }]);
  const out = await prodAuth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("401"), true);
});

Deno.test("test reports a valid token that reaches no account", async () => {
  const { ctx } = mockCtx([{ body: { sub: "u", accounts: [] } }]);
  const out = await prodAuth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("no Docusign account"), true);
});

// ------------------------------------------------------------- afterConnect --

Deno.test("afterConnect records the default account's base URI and id", async () => {
  const { ctx, calls } = mockCtx([{ body: USERINFO }]);
  const display = await prodAuth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(calls[0].url, "https://account.docusign.com/oauth/userinfo");
  assertEquals(display, {
    environment: "production",
    baseUri: "https://na3.docusign.net",
    accountId: "na-acct",
    accountName: "Example Corporation",
    isDefaultAccount: true,
    userName: "First Last",
    email: "first@example.com",
  });
});

Deno.test("afterConnect honours the connect-time account id and its region", async () => {
  const { ctx } = mockCtx([{ body: USERINFO }]);
  const display = await prodAuth.afterConnect!(
    { credential: { accessToken: "t", accountId: "eu-acct" } },
    ctx,
  );
  assertEquals(display.baseUri, "https://eu.docusign.net");
  assertEquals(display.accountId, "eu-acct");
  assertEquals(display.isDefaultAccount, false);
});

Deno.test("afterConnect stamps the demo environment and its host", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      sub: "u",
      accounts: [{
        account_id: "d-1",
        account_name: "Sandbox",
        base_uri: "https://demo.docusign.net",
        is_default: true,
      }],
    },
  }]);
  const display = await demoAuth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(calls[0].url, "https://account-d.docusign.com/oauth/userinfo");
  assertEquals(display.environment, "demo");
  assertEquals(display.baseUri, "https://demo.docusign.net");
});

Deno.test("afterConnect normalises a trailing slash on base_uri", async () => {
  const { ctx } = mockCtx([{
    body: {
      accounts: [{ account_id: "a", base_uri: "https://au.docusign.net/", is_default: true }],
    },
  }]);
  const display = await prodAuth.afterConnect!({ credential: { accessToken: "t" } }, ctx);
  assertEquals(display.baseUri, "https://au.docusign.net");
});

Deno.test("afterConnect fails loudly when userinfo cannot be read", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const err = await assertRejects(
    () => Promise.resolve(prodAuth.afterConnect!({ credential: { accessToken: "t" } }, ctx)),
  ) as Error;
  assertEquals(err.message.includes("500"), true);
  assertEquals(err.message.includes("base URI"), true);
});

Deno.test("afterConnect rejects a base_uri outside the egress allowlist", async () => {
  const { ctx } = mockCtx([{
    body: {
      accounts: [{ account_id: "a", base_uri: "https://evil.example.com", is_default: true }],
    },
  }]);
  await assertRejects(() =>
    Promise.resolve(prodAuth.afterConnect!({ credential: { accessToken: "t" } }, ctx))
  );
});

Deno.test("afterConnect with no token records only the environment", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await prodAuth.afterConnect!({ credential: {} }, ctx), {
    environment: "production",
  });
  assertEquals(calls.length, 0);
});

// ------------------------------------------------------------- the  factory --

Deno.test("the factory produces two distinct methods from one implementation", () => {
  const a = createDocusignOAuth("production");
  const b = createDocusignOAuth("demo");
  assertEquals(a.key, "oauth2");
  assertEquals(b.key, "oauth2-demo");
  assertEquals(a.connectionLabel, b.connectionLabel);
  assertEquals(a.oauth2?.authorizationUrl === b.oauth2?.authorizationUrl, false);
});
