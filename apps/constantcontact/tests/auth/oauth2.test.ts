import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares the authorization-code flow against the authz host", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://authz.constantcontact.com/oauth2/default/v1/authorize",
  );
  assertEquals(
    auth.oauth2?.tokenUrl,
    "https://authz.constantcontact.com/oauth2/default/v1/token",
  );
  assertEquals(auth.oauth2?.pkce, false);
});

Deno.test("oauth2: requests offline_access so a refresh token is issued", () => {
  assert(auth.oauth2?.scopes?.includes("offline_access"));
});

Deno.test("oauth2: requests only the scopes this app uses, and no write-account scope", () => {
  assertEquals(auth.oauth2?.scopes, [
    "contact_data",
    "campaign_data",
    "account_read",
    "offline_access",
  ]);
  assert(!auth.oauth2?.scopes?.includes("account_update"));
  assert(!auth.oauth2?.scopes?.includes("billing_data"));
});

Deno.test("oauth2: does not use the retired idfed token host", () => {
  assert(!auth.oauth2?.tokenUrl?.includes("idfed"));
});

Deno.test("oauth2: sign injects `Authorization: Bearer <accessToken>`", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.cc.email/v3/contacts",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "jwt-abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer jwt-abc");
});

Deno.test("oauth2: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  const request = {
    url: "https://api.cc.email/v3/contacts",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  await auth.sign!({ request, credential: { accessToken: "jwt-abc" } }, ctx);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test with a missing token fails without a network call", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes /contacts?limit=1, not the account summary", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { contacts: [] } }]);
  const result = await auth.test({ credential: { accessToken: "jwt-abc" } }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.hostname, "api.cc.email");
  assertEquals(url.pathname, "/v3/contacts");
  assertEquals(url.searchParams.get("limit"), "1");
  assertEquals(calls[0].headers["authorization"], "Bearer jwt-abc");
});

Deno.test("oauth2: test reports a 403 as a scope problem, distinct from a dead token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "narrow" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("contact_data"));
});

Deno.test("oauth2: test surfaces the upstream status on a 401", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("401"));
  assert(!(result.message ?? "").includes("contact_data"));
});

Deno.test("oauth2: afterConnect labels the connection from the account summary", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      organization_name: "Acme Co",
      contact_email: "ops@acme.test",
      encoded_account_id: "abc123",
      website: "https://acme.test",
    },
  }]);
  const out = await auth.afterConnect!({ credential: {} }, ctx) as {
    account?: Record<string, unknown>;
  };
  assertEquals(new URL(calls[0].url).pathname, "/v3/account/summary");
  assertEquals(out.account?.organization_name, "Acme Co");
  assertEquals(out.account?.contact_email, "ops@acme.test");
  assertEquals(out.account?.encoded_account_id, "abc123");
  assertEquals(out.account?.website, undefined, "only the label fields are carried");
});

Deno.test("oauth2: afterConnect tolerates a 403 from a connection lacking account_read", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {});
});

Deno.test("oauth2: connectionLabel names the organisation", () => {
  assertEquals(auth.connectionLabel, "{{account.organization_name}}");
});
