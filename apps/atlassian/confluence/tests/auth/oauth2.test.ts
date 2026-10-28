import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: uses Atlassian's identity endpoints, with PKCE and the API audience", () => {
  assertEquals(auth.oauth2!.authorizationUrl, "https://auth.atlassian.com/authorize");
  assertEquals(auth.oauth2!.tokenUrl, "https://auth.atlassian.com/oauth/token");
  assertEquals(auth.oauth2!.refreshUrl, "https://auth.atlassian.com/oauth/token");
  assertEquals(auth.oauth2!.pkce, true);
  assertEquals(auth.oauth2!.extraAuthParams?.audience, "api.atlassian.com");
});

Deno.test("oauth2: requests offline_access, or the connection dies in an hour", () => {
  // Without it Atlassian issues no refresh token and scheduled runs break.
  assert(auth.oauth2!.scopes!.includes("offline_access"));
  assert(auth.oauth2!.scopes!.includes("read:confluence-content.all"));
  assert(auth.oauth2!.scopes!.includes("write:confluence-content"));
});

Deno.test("oauth2: signs with the access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.atlassian.com/ex/confluence/cid/wiki/api/v2/pages",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test asks which sites the token can reach", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "cid", name: "Acme" }] }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.atlassian.com/oauth/token/accessible-resources");
});

Deno.test("oauth2: a token that reaches no site is not a working connection", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), {
    ok: false,
    message: "the token grants access to no Atlassian site",
  });
});

Deno.test("oauth2: afterConnect resolves the cloud id the client needs", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ id: "cid", name: "Acme", url: "https://acme.atlassian.net" }] },
    { status: 200, body: { accountId: "acc1", displayName: "Ann" } },
  ]);
  const display = await auth.afterConnect!({} as never, ctx) as Record<string, unknown>;
  assertEquals(display.cloudId, "cid");
  assertEquals(display.siteName, "Acme");
  assertEquals(display.siteUrl, "https://acme.atlassian.net");
  assertEquals((display.user as Record<string, unknown>).displayName, "Ann");
  // The whoami goes through the gateway, not the site host.
  assertEquals(
    calls[1].url,
    "https://api.atlassian.com/ex/confluence/cid/wiki/rest/api/user/current",
  );
});

Deno.test("oauth2: with no accessible site there is nothing to record", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  assertEquals(await auth.afterConnect!({} as never, ctx), {});
});
