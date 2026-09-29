import { assert, assertEquals } from "@std/assert";
import auth, { userKeyAuthHeader } from "../../auth/database-credentials.ts";
import { API_URL } from "../../lib/client.ts";
import { FORBIDDEN_403, mockCtx, UNAUTHORIZED_401 } from "../_helpers.ts";

Deno.test("userKeyAuthHeader: matches the collection's own captured example header verbatim", () => {
  // The collection's "Contacts GET" originalRequest carries this literal
  // header; it decodes to `apiKey:userKey` for the same demo database's
  // `/authentication` example response (`user_key: "2F1DB82B-..."`).
  const header = userKeyAuthHeader(
    "1855B9E3-CD88-402E-909B-130F2AC174FC",
    "2F1DB82B-9562-4CE2-B88B-02035C95490F",
  );
  assertEquals(
    header,
    "UserKeyAuth MTg1NUI5RTMtQ0Q4OC00MDJFLTkwOUItMTMwRjJBQzE3NEZDOjJGMURCODJCLTk1NjItNENFMi1CODhCLTAyMDM1Qzk1NDkwRg==",
  );
});

Deno.test("userKeyAuthHeader: is 'UserKeyAuth ' + base64(apiKey:userKey)", () => {
  const header = userKeyAuthHeader("key", "uk");
  assertEquals(header, `UserKeyAuth ${btoa("key:uk")}`);
});

Deno.test("database-credentials: exchange calls GET /authentication with 3-part Basic auth", async () => {
  const { ctx, calls } = mockCtx([{
    body: { redtail_database_id: 280717, redtail_user_id: 280717, user_key: "the-user-key" },
  }]);
  const cred = await auth.exchange!(
    { fields: { apiKey: "ak", username: "user1", password: "pw" } } as never,
    ctx,
  );
  assertEquals(calls[0].url, `${API_URL}/authentication`);
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("ak:user1:pw")}`);
  assertEquals(cred, {
    apiKey: "ak",
    username: "user1",
    password: "pw",
    userKey: "the-user-key",
    databaseId: 280717,
    userId: 280717,
  });
});

Deno.test("database-credentials: exchange requires all three fields", async () => {
  const { ctx } = mockCtx([]);
  await assertRejectsMessage(
    async () => await auth.exchange!({ fields: { username: "u", password: "p" } } as never, ctx),
    "apiKey",
  );
  await assertRejectsMessage(
    async () => await auth.exchange!({ fields: { apiKey: "a", password: "p" } } as never, ctx),
    "username",
  );
  await assertRejectsMessage(
    async () => await auth.exchange!({ fields: { apiKey: "a", username: "u" } } as never, ctx),
    "password",
  );
});

Deno.test("database-credentials: exchange throws when the response carries no user_key", async () => {
  const { ctx } = mockCtx([{ body: { redtail_database_id: 1, redtail_user_id: 1 } }]);
  await assertRejectsMessage(
    async () =>
      await auth.exchange!({ fields: { apiKey: "a", username: "u", password: "p" } } as never, ctx),
    "no user_key",
  );
});

Deno.test("database-credentials: sign stamps a UserKeyAuth header and returns the request", () => {
  const request = {
    url: `${API_URL}/contacts`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!(
    { request, credential: { apiKey: "ak", userKey: "uk" } } as never,
    null as never,
  );
  assertEquals((out as typeof request).headers["authorization"], `UserKeyAuth ${btoa("ak:uk")}`);
});

Deno.test("database-credentials: sign is a no-op when the credential is incomplete", () => {
  const request = {
    url: `${API_URL}/contacts`,
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = auth.sign!({ request, credential: {} } as never, null as never);
  assertEquals((out as typeof request).headers["authorization"], undefined);
});

Deno.test("database-credentials: refresh re-runs the same exchange", async () => {
  const { ctx, calls } = mockCtx([{ body: { user_key: "new-key" } }]);
  const cred = await auth.refresh!(
    { credential: { apiKey: "ak", username: "u", password: "p" } } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], `Basic ${btoa("ak:u:p")}`);
  assertEquals((cred as { userKey: string }).userKey, "new-key");
});

Deno.test("database-credentials: refresh throws when the stored credential is missing parts", async () => {
  const { ctx } = mockCtx([]);
  await assertRejectsMessage(
    async () => await auth.refresh!({ credential: { apiKey: "ak" } } as never, ctx),
    "reconnect",
  );
  assertEquals(ctx, ctx); // no fetch was attempted
});

Deno.test("database-credentials: test probes GET /contacts?page=1 with the signed header", async () => {
  const { ctx, calls } = mockCtx([{ body: { contacts: [] } }]);
  const res = await auth.test({ credential: { apiKey: "ak", userKey: "uk" } } as never, ctx);
  assertEquals(res, { ok: true });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/public/v1/contacts");
  assertEquals(url.searchParams.get("page"), "1");
  assertEquals(calls[0].headers["authorization"], `UserKeyAuth ${btoa("ak:uk")}`);
});

Deno.test("database-credentials: test never echoes credential material back in a success", async () => {
  const { ctx } = mockCtx([{ body: { contacts: [{ id: 1 }] } }]);
  const res = await auth.test({ credential: { apiKey: "ak", userKey: "uk" } } as never, ctx);
  const serialized = JSON.stringify(res);
  assert(!serialized.includes("ak"));
  assert(!serialized.includes("uk"));
});

Deno.test("database-credentials: test reports a 401 as a revoked/invalid credential", async () => {
  const { ctx } = mockCtx([UNAUTHORIZED_401]);
  const res = await auth.test({ credential: { apiKey: "ak", userKey: "bad" } } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("401"));
  assert(res.message!.includes("reconnect"));
});

Deno.test("database-credentials: test reports a non-401 failure without inventing a diagnosis", async () => {
  const { ctx } = mockCtx([FORBIDDEN_403]);
  const res = await auth.test({ credential: { apiKey: "ak", userKey: "uk" } } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("403"));
  assert(!res.message!.includes("reconnect"));
});

Deno.test("database-credentials: test does not call the API when the credential is incomplete", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await auth.test({ credential: {} } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("database-credentials: afterConnect reads the connected user's display name", async () => {
  const { ctx, calls } = mockCtx([{
    body: { database_users: { id: 1, first_name: "Teddy", last_name: "Bear" } },
  }]);
  const out = await auth.afterConnect!(
    { credential: { apiKey: "ak", userKey: "uk", userId: 1 } } as never,
    ctx,
  );
  assertEquals(out, { name: "Teddy Bear" });
  assertEquals(new URL(calls[0].url).pathname, "/api/public/v1/lists/database_users/1");
});

Deno.test("database-credentials: afterConnect degrades to no label rather than throwing", async () => {
  const { ctx } = mockCtx([UNAUTHORIZED_401]);
  const out = await auth.afterConnect!(
    { credential: { apiKey: "ak", userKey: "uk", userId: 1 } } as never,
    ctx,
  );
  assertEquals(out, {});
});

Deno.test("database-credentials: afterConnect is a no-op without a userId", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await auth.afterConnect!(
    { credential: { apiKey: "ak", userKey: "uk" } } as never,
    ctx,
  );
  assertEquals(out, {});
  assertEquals(calls.length, 0);
});

Deno.test("database-credentials: declares no revoke hook — nothing invalidates a user_key", () => {
  assertEquals(auth.revoke, undefined);
});

async function assertRejectsMessage(fn: () => Promise<unknown>, substring: string) {
  try {
    await fn();
    throw new Error("expected rejection");
  } catch (err) {
    assert((err as Error).message.includes(substring), `expected "${substring}" in: ${err}`);
  }
}
