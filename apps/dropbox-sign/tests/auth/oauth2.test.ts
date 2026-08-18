import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

/**
 * The spec puts /oauth/token under `https://api.hellosign.com/v3`, which 404s.
 * Both halves of the flow are on app.hellosign.com, measured 2026-08-18.
 */
Deno.test("oauth2: points at the endpoints that exist, not the ones the spec implies", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2!.authorizationUrl, "https://app.hellosign.com/oauth/authorize");
  assertEquals(auth.oauth2!.tokenUrl, "https://app.hellosign.com/oauth/token");
  assertEquals(auth.oauth2!.refreshUrl, "https://app.hellosign.com/oauth/token");
  for (const url of [auth.oauth2!.authorizationUrl, auth.oauth2!.tokenUrl]) {
    assert(!url.includes("api.hellosign.com"), `${url} is on the API host`);
    assert(!url.includes("/v3"), `${url} carries the API path version`);
  }
});

Deno.test("oauth2: asks for the scopes the actions use and not the admin one", () => {
  const scopes = auth.oauth2!.scopes!;
  for (const needed of ["request_signature", "signature_request_access", "template_access"]) {
    assert(scopes.includes(needed), `missing ${needed}`);
  }
  // This app ships no API App action, so it never asks to manage them.
  assert(!scopes.includes("api_app_access"), "api_app_access is not this app's business");
});

Deno.test("oauth2: signs with the access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.hellosign.com/v3/account",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test calls the account endpoint on the API host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { account: {} } }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/account");
});

Deno.test("oauth2: a rejected token says so, another status reports itself", async () => {
  const rejected = mockCtx([{ status: 401, body: "" }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, rejected.ctx), {
    ok: false,
    message: "Dropbox Sign rejected the token (401)",
  });
  const other = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, other.ctx), {
    ok: false,
    message: "Dropbox Sign returned 500",
  });
});

Deno.test("oauth2: a missing token fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect publishes the account, never the token", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { account: { email_address: "ada@example.com", account_id: "a1", is_paid_hs: false } },
  }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "tok-secret" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { accountEmail: "ada@example.com", accountId: "a1", paidSignPlan: false });
  assert(!JSON.stringify(display).includes("tok-secret"), "the token leaked into display");
});
