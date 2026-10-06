import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import clientCredentials from "../../auth/client-credentials.ts";
import oauth2 from "../../auth/oauth2.ts";

const token = {
  status: 200,
  body: { access_token: "tok", expires_in: 3600, token_type: "Bearer" },
};

Deno.test("client-credentials: exchange posts the grant to login.sellsy.com", async () => {
  const { ctx, calls } = mockCtx([token]);
  const cred = await clientCredentials.exchange!(
    { fields: { clientId: "id", clientSecret: "sec" } } as never,
    ctx,
  ) as Record<string, string>;
  assertEquals(calls[0].url, "https://login.sellsy.com/oauth2/access-tokens");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    grant_type: "client_credentials",
    client_id: "id",
    client_secret: "sec",
  });
  assertEquals(cred.accessToken, "tok");
  assertEquals(cred.clientId, "id");
  const left = new Date(cred.expiresAt).getTime() - Date.now();
  assert(left > 3400_000 && left <= 3540_000, `expiresAt headroom ${left}`);
});

Deno.test("client-credentials: exchange needs both fields", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(clientCredentials.exchange!({ fields: { clientId: "id" } } as never, ctx)),
    Error,
    "required",
  );
});

Deno.test("client-credentials: a refused grant explains the personal-client rule", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_client", error_description: "Client authentication failed" },
  }]);
  await assertRejects(
    () =>
      Promise.resolve(
        clientCredentials.exchange!({ fields: { clientId: "a", clientSecret: "b" } } as never, ctx),
      ),
    Error,
    "Client authentication failed",
  );
});

Deno.test("client-credentials: refresh repeats the grant with the stored id and secret", async () => {
  const { ctx, calls } = mockCtx([token]);
  await clientCredentials.refresh!(
    { credential: { clientId: "id", clientSecret: "sec", accessToken: "old" } } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).client_secret, "sec");
});

for (const auth of [clientCredentials, oauth2]) {
  Deno.test(`${auth.key}: sign stamps a Bearer header`, async () => {
    const req = {
      url: "https://api.sellsy.com/v2/quotas",
      method: "GET",
      headers: {} as Record<string, string>,
    };
    const { ctx } = mockCtx([]);
    const out = await auth.sign!(
      { request: req, credential: { accessToken: "tok" } } as never,
      ctx,
    );
    assertEquals((out as typeof req).headers["authorization"], "Bearer tok");
  });

  Deno.test(`${auth.key}: test passes on 200 from /quotas`, async () => {
    const { ctx, calls } = mockCtx([{ status: 200, body: { pipelines: { limit: 5, used: 1 } } }]);
    const r = await auth.test({ credential: { accessToken: "tok" } } as never, ctx);
    assertEquals(r.ok, true);
    assertEquals(calls[0].url, "https://api.sellsy.com/v2/quotas");
    assertEquals(calls[0].headers["authorization"], "Bearer tok");
  });

  Deno.test(`${auth.key}: test fails on the vendor's 401 envelope, passes on a 403 scope refusal`, async () => {
    const { ctx } = mockCtx([
      { status: 401, body: { error: { code: 401, message: "Token expired" } } },
      { status: 403, body: { error: { code: 403, message: "Forbidden" } } },
    ]);
    const bad = await auth.test({ credential: { accessToken: "tok" } } as never, ctx);
    assertEquals(bad.ok, false);
    assert(bad.message!.includes("Token expired"));
    const noScope = await auth.test({ credential: { accessToken: "tok" } } as never, ctx);
    assertEquals(noScope.ok, true);
    assert(noScope.message!.includes("accounts.read"));
  });

  Deno.test(`${auth.key}: test with no token never calls the API`, async () => {
    const { ctx, calls } = mockCtx([]);
    assertEquals((await auth.test({ credential: {} } as never, ctx)).ok, false);
    assertEquals(calls.length, 0);
  });
}

Deno.test("oauth2: authorization-code flow against login.sellsy.com with PKCE", () => {
  assertEquals(oauth2.oauth2!.authorizationUrl, "https://login.sellsy.com/oauth2/authorization");
  assertEquals(oauth2.oauth2!.tokenUrl, "https://login.sellsy.com/oauth2/access-tokens");
  assertEquals(oauth2.oauth2!.pkce, true);
  assert(oauth2.oauth2!.scopes!.includes("companies.read"));
});
