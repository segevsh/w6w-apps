import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/server-to-server.ts";

Deno.test("server-to-server: collects three secret fields and no browser flow", () => {
  assertEquals(auth.key, "server-to-server");
  // `custom`: the account_credentials grant is not the OAuth code flow the
  // `oauth2` type models.
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => f.key), ["accountId", "clientId", "clientSecret"]);
  for (const f of auth.fields!) {
    assertEquals(f.type, "secret");
    assert(f.required);
  }
});

Deno.test("server-to-server: exchange mints a token with the account_credentials grant", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok", expires_in: 3600 } }]);
  const cred = await auth.exchange!(
    { fields: { accountId: "acc", clientId: "cid", clientSecret: "sec" } },
    ctx,
  ) as Record<string, string>;

  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://zoom.us/oauth/token");
  assertEquals(url.searchParams.get("grant_type"), "account_credentials");
  assertEquals(url.searchParams.get("account_id"), "acc");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("cid:sec")}`);

  assertEquals(cred.accessToken, "tok");
  // The account credentials stay in the stored credential because `refresh`
  // needs them to mint the next token.
  assertEquals(cred.clientId, "cid");
  assert(typeof cred.expiresAt === "string");
});

Deno.test("server-to-server: the recorded expiry leaves headroom before Zoom's", async () => {
  const { ctx } = mockCtx([{ body: { access_token: "tok", expires_in: 3600 } }]);
  const cred = await auth.exchange!(
    { fields: { accountId: "a", clientId: "c", clientSecret: "s" } },
    ctx,
  ) as { expiresAt: string };
  const ttlMs = new Date(cred.expiresAt).getTime() - Date.now();
  // An hour minus the 60s of skew headroom.
  assert(ttlMs < 3600_000, "must expire before Zoom's own token does");
  assert(ttlMs > 3500_000, "but not so early that it churns");
});

Deno.test("server-to-server: exchange refuses an incomplete form without a request", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(() => auth.exchange!({ fields: { accountId: "a" } }, ctx), Error, "all required");
  assertEquals(calls.length, 0);
});

Deno.test("server-to-server: exchange surfaces Zoom's rejection reason", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { reason: "Invalid client_id or client_secret" },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        auth.exchange!({ fields: { accountId: "a", clientId: "c", clientSecret: "s" } }, ctx),
      ),
    Error,
    "Invalid client_id or client_secret",
  );
});

Deno.test("server-to-server: refresh re-mints from the stored account credentials", async () => {
  const { ctx, calls } = mockCtx([{ body: { access_token: "tok2", expires_in: 3600 } }]);
  const cred = await auth.refresh!(
    { credential: { accountId: "acc", clientId: "cid", clientSecret: "sec", accessToken: "old" } },
    ctx,
  ) as Record<string, string>;
  assertEquals(new URL(calls[0].url).searchParams.get("account_id"), "acc");
  assertEquals(cred.accessToken, "tok2");
});

Deno.test("server-to-server: sign stamps the current token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.zoom.us/v2/users/me",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("server-to-server: test tells the user to reconnect when there is no token", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential has no accessToken — reconnect",
  });
  assertEquals(calls.length, 0);
});

Deno.test("server-to-server: afterConnect labels with the user and account", async () => {
  const { ctx } = mockCtx([{
    body: { id: "u1", email: "jo@acme.test", first_name: "Jo", account_id: "acc" },
  }]);
  assertEquals(await auth.afterConnect!({ credential: {} }, ctx), {
    user: { id: "u1", email: "jo@acme.test", name: "Jo" },
    account: { id: "acc" },
  });
});
