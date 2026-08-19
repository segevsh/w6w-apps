import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/application.ts";

const fields = { host: "https://api.airbyte.com", clientId: "cid", clientSecret: "sec" };
const token = {
  status: 200,
  body: { access_token: "tok-1", token_type: "Bearer", expires_in: 180 },
};

/** The documented body: snake_case ids, hyphenated grant. */
Deno.test("application: mints a token with Airbyte's exact field names", async () => {
  const { ctx, calls } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.airbyte.com/v1/applications/token");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!) as Record<string, string>;
  assertEquals(body.client_id, "cid");
  assertEquals(body.client_secret, "sec");
  assertEquals(body["grant-type"], "client_credentials", "hyphen, as the schema documents");
  assertEquals(credential.accessToken, "tok-1");
});

/** Three minutes, minus a margin so the refresh beats the request. */
Deno.test("application: expires the token early rather than at its deadline", async () => {
  const { ctx } = mockCtx([token]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  const ttl = (new Date(String(credential.expiresAt)).getTime() - Date.now()) / 1000;
  assert(ttl > 100 && ttl < 180, `expiry is ${ttl}s, which is not inside the three minutes`);
});

/** A token with no reported lifetime is still treated as short-lived. */
Deno.test("application: a missing expires_in defaults to the documented three minutes", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { access_token: "tok-2" } }]);
  const credential = await auth.exchange!({ fields }, ctx) as Record<string, unknown>;
  const ttl = (new Date(String(credential.expiresAt)).getTime() - Date.now()) / 1000;
  assert(ttl <= 180, `expiry is ${ttl}s, which is longer than Airbyte's own default`);
});

Deno.test("application: refresh mints again from the stored application", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { access_token: "tok-3", expires_in: 180 },
  }]);
  const refreshed = await auth.refresh!(
    { credential: { ...fields, accessToken: "old" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(refreshed.accessToken, "tok-3");
  assertEquals(refreshed.clientId, "cid");
  assertEquals(JSON.parse(calls[0].body!).client_id, "cid");
});

Deno.test("application: signs with the minted token, never the client secret", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: { accessToken: "tok-1", clientSecret: "sec" } } as never,
    mockCtx([]).ctx,
  ) as typeof request;
  assertEquals(signed.headers["authorization"], "Bearer tok-1");
});

Deno.test("application: exchange refuses without both halves", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await auth.exchange!({ fields: { host: "x", clientId: "cid" } }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/both required/.test(message), message);
  assertEquals(calls.length, 0);
});

/** Verified live: the token endpoint returns only an error id. */
Deno.test("application: a rejected application surfaces the opaque error id", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errorId: "125f562d" } }]);
  let message = "";
  try {
    await auth.exchange!({ fields }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/125f562d/.test(message), message);
  assert(/THREE MINUTES/.test(message), message);
});

Deno.test("application: the test reports the credential's reach and its lifetime", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ workspaceId: "w1" }] } }]);
  const result = await auth.test!(
    { credential: { ...fields, accessToken: "tok-1" } } as never,
    ctx,
  );
  assertEquals(calls[0].url, "https://api.airbyte.com/v1/workspaces?limit=1");
  assertEquals(result.ok, true);
  assert(/access of the user who created it/.test(result.message!), result.message);
  assert(/expire after three minutes/.test(result.message!), result.message);
});

Deno.test("application: afterConnect labels cloud against self-managed", () => {
  const cloud = auth.afterConnect!({ credential: fields }, mockCtx([]).ctx) as Record<
    string,
    unknown
  >;
  assertEquals(cloud.deployment, "cloud");
  assertEquals(cloud.hostLabel, "Airbyte Cloud");

  const self = auth.afterConnect!(
    { credential: { ...fields, host: "https://airbyte.internal" } },
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(self.deployment, "self-managed");
  assertEquals(self.hostLabel, "airbyte.internal");
  assert(!JSON.stringify(self).includes('"sec"'), JSON.stringify(self));
});

/** Self-hosted Airbyte can be deployed with authentication off entirely. */
Deno.test("application: the host hint warns about an unauthenticated deployment", () => {
  const field = auth.fields!.find((f) => f.key === "host")!;
  assert(/answers to anybody who can reach it/.test(field.hint!), field.hint);
});
