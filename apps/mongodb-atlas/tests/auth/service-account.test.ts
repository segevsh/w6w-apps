import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/service-account.ts";

const fields = { clientId: "mdb_sa_id_x", clientSecret: "mdb_sa_sk_y" };
const token = { status: 200, body: { access_token: "at-1", expires_in: 3600 } };
const orgs = {
  status: 200,
  body: { results: [{ id: "org-1", name: "Acme" }], totalCount: 1 },
};

/**
 * Measured: the body form answers 400 "No Authorization header provided",
 * which reads like a client bug rather than a choice of form.
 */
Deno.test("service-account: sends the client credentials as Basic, not in the body", async () => {
  const { ctx, calls } = mockCtx([token]);
  await auth.exchange!({ fields }, ctx);
  assertEquals(calls[0].url, "https://cloud.mongodb.com/api/oauth/token");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("mdb_sa_id_x:mdb_sa_sk_y")}`);
  assertEquals(calls[0].body, "grant_type=client_credentials");
  assertEquals(calls[0].body!.includes("client_secret"), false);
});

Deno.test("service-account: keeps the client credentials so refresh can re-mint", async () => {
  const { ctx } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  assertEquals(credential.clientId, "mdb_sa_id_x");
  assertEquals(credential.clientSecret, "mdb_sa_sk_y");
  assertEquals(credential.accessToken, "at-1");
  assert(typeof credential.expiresAt === "string", "an expiry is recorded");
});

/** An hour, with a minute of headroom for clock skew. */
Deno.test("service-account: records an expiry inside the token's stated lifetime", async () => {
  const { ctx } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, string>;
  const ttl = new Date(credential.expiresAt).getTime() - Date.now();
  assert(ttl > 0 && ttl < 3600_000, `expiry ${ttl}ms is not inside the hour`);
});

Deno.test("service-account: refresh is the same call again", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.refresh!({ credential: fields }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://cloud.mongodb.com/api/oauth/token");
  assertEquals(credential.accessToken, "at-1");
});

Deno.test("service-account: a rejected client secret surfaces the OAuth error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "invalid_client", error_description: "Invalid credentials provided" },
  }]);
  let message = "";
  try {
    await auth.exchange!({ fields }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/Invalid credentials provided/.test(message), message);
});

Deno.test("service-account: exchange refuses without both values", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await auth.exchange!({ fields: { clientId: "x" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/both required/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("service-account: signs as a bearer", () => {
  const request = {
    url: "https://cloud.mongodb.com/api/atlas/v2/orgs",
    headers: {} as Record<string, string>,
  };
  const signed = auth.sign!(
    { request, credential: { accessToken: "at-1" } } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer at-1");
  assertEquals(auth.type, "custom");
});

Deno.test("service-account: the test reads the organisation list", async () => {
  const { ctx, calls } = mockCtx([orgs]);
  const result = await auth.test!({ credential: { accessToken: "at-1" } } as never, ctx);
  assertEquals(calls[0].url, "https://cloud.mongodb.com/api/atlas/v2/orgs");
  assertEquals(calls[0].headers["accept"].startsWith("application/vnd.atlas."), true);
  assertEquals(result.ok, true);
  assert(/Acme/.test(result.message!), result.message);
});

/**
 * The state nothing else reports: the credential is perfect and the account
 * has no role, so it can do nothing at all.
 */
Deno.test("service-account: a token with no role fails the test, explaining why", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [], totalCount: 0 } }]);
  const result = await auth.test!({ credential: { accessToken: "at-1" } } as never, ctx);
  assertEquals(result.ok, false);
  assert(/created but not granted a role/.test(result.message!), result.message);
  assert(/Access Manager/.test(result.message!), result.message);
});

Deno.test("service-account: a missing or rejected token fails cleanly", async () => {
  const none = mockCtx([]);
  assertEquals((await auth.test!({ credential: {} } as never, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);

  const rejected = mockCtx([{ status: 401, body: "" }]);
  const result = await auth.test!({ credential: { accessToken: "at-1" } } as never, rejected.ctx);
  assertEquals(result.ok, false);
  assert(/lasts an hour/.test(result.message!), result.message);
});

Deno.test("service-account: afterConnect records the organisation", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { results: [{ id: "org-1", name: "Acme" }, { id: "org-2", name: "Labs" }] },
  }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "at-1" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.orgId, "org-1");
  assertEquals(display.orgName, "Acme");
  assertEquals(display.orgCount, 2);
});

Deno.test("service-account: afterConnect survives the call failing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "at-1" } }, ctx), {});
});

/** Digest needs a challenge round-trip; a sign hook sees one request. */
Deno.test("service-account: says why the API-key scheme is not offered", () => {
  assert(/HTTP DIGEST/.test(auth.description!), auth.description);
  assert(/challenge round-trip/.test(auth.description!), auth.description);
  assertEquals(auth.fields!.map((f) => f.key), ["clientId", "clientSecret"]);
  assertEquals(auth.fields!.every((f) => f.type === "secret"), true);
});
