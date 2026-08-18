import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/client-credentials.ts";

const token = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { access_token: "vat_1", expires_in: 3600, token_type: "Bearer", ...extra },
});
const frameworks = (data: unknown[]) => ({
  status: 200,
  body: { results: { data, pageInfo: { hasNextPage: false } } },
});

Deno.test("client-credentials: exchange posts the grant and records an expiry", async () => {
  const { ctx, calls } = mockCtx([token()]);
  const credential = await auth.exchange!(
    { fields: { clientId: "vci_1", clientSecret: "vcs_1" } },
    ctx,
  ) as Record<string, string>;
  assertEquals(calls[0].url, "https://api.vanta.com/oauth/token");
  assertEquals(JSON.parse(calls[0].body!), {
    grant_type: "client_credentials",
    client_id: "vci_1",
    client_secret: "vcs_1",
    scope: "vanta-api.all:read",
  });
  assertEquals(credential.accessToken, "vat_1");
  assert(Date.parse(credential.expiresAt) > Date.now(), credential.expiresAt);
});

/** Vanta Gov has its own token endpoint, not just its own API host. */
Deno.test("client-credentials: a gov tenant mints against the gov host", async () => {
  const { ctx, calls } = mockCtx([token()]);
  await auth.exchange!(
    { fields: { clientId: "vci_1", clientSecret: "vcs_1", region: "gov" } },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.vanta-gov.com/oauth/token");
});

/**
 * Re-minting is limited to 5 a minute, so the expiry is recorded with headroom
 * rather than refreshed optimistically at the last moment.
 */
Deno.test("client-credentials: the recorded expiry is a minute short of Vanta's", async () => {
  const { ctx } = mockCtx([token({ expires_in: 3600 })]);
  const credential = await auth.exchange!(
    { fields: { clientId: "vci_1", clientSecret: "vcs_1" } },
    ctx,
  ) as Record<string, string>;
  const seconds = (Date.parse(credential.expiresAt) - Date.now()) / 1000;
  assert(seconds < 3600 && seconds > 3500, `${seconds}`);
});

Deno.test("client-credentials: a requested scope reaches the wire", async () => {
  const { ctx, calls } = mockCtx([token()]);
  await auth.exchange!(
    {
      fields: {
        clientId: "vci_1",
        clientSecret: "vcs_1",
        scope: "vanta-api.all:read vanta-api.all:write",
      },
    },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!).scope,
    "vanta-api.all:read vanta-api.all:write",
  );
});

/** `invalid_scope` is the failure a mismatched application produces. */
Deno.test("client-credentials: a refusal explains the likely causes", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: "invalid_scope", error_description: "Scope not permitted" },
  }]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "vci_1", clientSecret: "vcs_1" } }, ctx),
    Error,
    "invalid_scope",
  );
});

Deno.test("client-credentials: exchange refuses an unknown region before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () =>
      await auth.exchange!(
        { fields: { clientId: "vci_1", clientSecret: "vcs_1", region: "eu" } },
        ctx,
      ),
    Error,
    "unknown Vanta region",
  );
  assertEquals(calls.length, 0);
});

Deno.test("client-credentials: exchange requires both halves of the credential", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    async () => await auth.exchange!({ fields: { clientId: "vci_1" } }, ctx),
    Error,
    "Client Secret",
  );
  assertEquals(calls.length, 0);
});

/** There is no refresh token — the credential is the id and secret. */
Deno.test("client-credentials: refresh re-mints with the stored credential", async () => {
  const { ctx, calls } = mockCtx([token({ access_token: "vat_2" })]);
  const credential = await auth.refresh!(
    { credential: { clientId: "vci_1", clientSecret: "vcs_1", region: "commercial", scope: "s" } },
    ctx,
  ) as Record<string, string>;
  assertEquals(JSON.parse(calls[0].body!).grant_type, "client_credentials");
  assertEquals(credential.accessToken, "vat_2");
});

Deno.test("client-credentials: sign sends the token as Bearer", () => {
  const request = { url: "https://api.vanta.com/v1/tests", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { accessToken: "vat_1" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], "Bearer vat_1");
});

Deno.test("client-credentials: test probes frameworks and names one back", async () => {
  const { ctx, calls } = mockCtx([frameworks([{ name: "SOC 2" }])]);
  const result = await auth.test!({ credential: { accessToken: "vat_1" } }, ctx);
  assertEquals(calls[0].url, "https://api.vanta.com/v1/frameworks?pageSize=1");
  assertEquals(result.ok, true);
  assert(result.message!.includes("SOC 2"), result.message);
});

Deno.test("client-credentials: a tenant with no frameworks still connects", async () => {
  const { ctx } = mockCtx([frameworks([])]);
  const result = await auth.test!({ credential: { accessToken: "vat_1" } }, ctx);
  assertEquals(result.ok, true);
  assert(/no frameworks/.test(result.message!), result.message);
});

/**
 * The 401 that matters: another process minting a token for the same
 * application revokes this one.
 */
Deno.test("client-credentials: a 401 names the revocation cause", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test!({ credential: { accessToken: "vat_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/same application/.test(result.message!), result.message);
});

Deno.test("client-credentials: a 403 is reported as a scope problem", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  const result = await auth.test!(
    { credential: { accessToken: "vat_1", scope: "vanta-api.vendors:read" } },
    ctx,
  );
  assertEquals(result.ok, false);
  assert(/scope/.test(result.message!), result.message);
});

Deno.test("client-credentials: a missing token is refused before a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The region is public metadata; the credentials and token never are. */
Deno.test("client-credentials: afterConnect records only the region", () => {
  const display = auth.afterConnect!(
    { credential: { region: "gov", clientSecret: "vcs_secret", accessToken: "vat_1" } },
    mockCtx().ctx,
  );
  assertEquals(display, { region: "gov" });
  assert(!JSON.stringify(display).includes("vcs_secret"));
});

Deno.test("client-credentials: both halves of the credential are secret fields", () => {
  const secrets = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secrets, ["clientId", "clientSecret"]);
});
