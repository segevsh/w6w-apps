import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth-client.ts";

const fields = { clientId: "cid", clientSecret: "tskey-client-xyz", tailnet: "-" };
const token = { status: 200, body: { access_token: "tok-1", expires_in: 3600 } };

/** Form-encoded client credentials, which is what the endpoint takes. */
Deno.test("oauth-client: mints a token with form-encoded client credentials", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.tailscale.com/api/v2/oauth/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const body = new URLSearchParams(calls[0].body!);
  assertEquals(body.get("grant_type"), "client_credentials");
  assertEquals(body.get("client_id"), "cid");
  assertEquals(body.get("client_secret"), "tskey-client-xyz");
  assertEquals(credential.accessToken, "tok-1");
});

/** The client itself never expires; its tokens last an hour. */
Deno.test("oauth-client: keeps the client so refresh can mint again", async () => {
  const { ctx } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(credential.clientId, "cid");
  const ttl = new Date(String(credential.expiresAt)).getTime() - Date.now();
  assert(ttl > 0 && ttl <= 3600_000, `expiry ${ttl}ms is not inside the hour`);

  const again = mockCtx([{ status: 200, body: { access_token: "tok-2" } }]);
  const refreshed = await auth.refresh!({ credential }, again.ctx) as Record<string, unknown>;
  assertEquals(refreshed.accessToken, "tok-2");
  assertEquals(refreshed.clientId, "cid");
});

/** A missing expiry is treated as the documented hour. */
Deno.test("oauth-client: a token with no expires_in still gets an expiry", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { access_token: "tok-3" } }]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assert(new Date(String(credential.expiresAt)).getTime() > Date.now());
});

Deno.test("oauth-client: signs with the minted token, not the client secret", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: { accessToken: "tok-1", clientSecret: "tskey-client-xyz" } } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer tok-1");
});

Deno.test("oauth-client: exchange refuses without both halves", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await auth.exchange!({ fields: { clientId: "cid" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/both required/.test(message), message);
  assertEquals(calls.length, 0);
});

/** A scope cannot be added to an existing client. */
Deno.test("oauth-client: a 403 on the test names the missing scope and the only fix", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "forbidden" } }]);
  const result = await auth.test!(
    { credential: { ...fields, accessToken: "tok-1" } } as never,
    ctx,
  );
  assertEquals(result.ok, false);
  assert(/devices:core:read/.test(result.message!), result.message);
  assert(/A new client is the only fix/.test(result.message!), result.message);
});

Deno.test("oauth-client: a working client reports that it does not expire", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { devices: [{}, {}] } }]);
  const result = await auth.test!(
    { credential: { ...fields, accessToken: "tok-1" } } as never,
    ctx,
  );
  assertEquals(result.ok, true);
  assert(/2 devices/.test(result.message!), result.message);
  assert(/does not expire/.test(result.message!), result.message);
});

Deno.test("oauth-client: afterConnect records the client id and never the secret", () => {
  const display = auth.afterConnect!(
    { credential: { ...fields, accessToken: "tok-1" } },
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(display.clientId, "cid");
  assertEquals(display.credentialKind, "OAuth client");
  assert(!JSON.stringify(display).includes("tskey-client"), JSON.stringify(display));
});
