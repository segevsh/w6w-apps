import { assert, assertEquals, assertRejects } from "@std/assert";
import apiToken, { decodeClaims, expiryOf, mint } from "../../auth/api-token.ts";
import { BASE_PATH, BASE_UUID, fakeJwt, mockCtx, pathOf } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

const EXP = 1_900_000_000; // seconds
const accessToken = fakeJwt({ exp: EXP, permission: "rw", dtable_uuid: BASE_UUID });

const exchangeBody = {
  app_name: "w6w",
  access_token: accessToken,
  dtable_uuid: BASE_UUID,
  dtable_server: "https://cloud.seatable.io/api-gateway/",
  workspace_id: 234,
  use_api_gateway: true,
  dtable_name: "My Base",
};

Deno.test("api-token: exchange GETs /app-access-token/ with the API token as bearer", async () => {
  const { ctx, calls } = mockCtx([{ body: exchangeBody }]);
  const cred = await apiToken.exchange!({ fields: { apiToken: " tok123 " } }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://cloud.seatable.io/api/v2.1/dtable/app-access-token/");
  assertEquals(calls[0].headers.authorization, "Bearer tok123");
  assertEquals(cred.apiToken, "tok123");
  assertEquals(cred.accessToken, accessToken);
  assertEquals(cred.dtableUuid, BASE_UUID);
  assertEquals(cred.dtableName, "My Base");
  assertEquals(cred.permission, "rw");
  // Renewal is requested an hour before the real expiry.
  assertEquals(cred.expiresAt, new Date(EXP * 1000 - 3600_000).toISOString());
});

Deno.test("api-token: exchange without a token is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => {
      await apiToken.exchange!({ fields: {} }, ctx);
    },
    Error,
    "required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("api-token: a bad API token surfaces the vendor's 403 body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error_msg: "Permission denied." } }]);
  await assertRejects(
    async () => {
      await apiToken.exchange!({ fields: { apiToken: "bad" } }, ctx);
    },
    Error,
    "403: Permission denied.",
  );
});

Deno.test("api-token: a base served from another host is refused (Cloud only)", async () => {
  const { ctx } = mockCtx([
    { body: { ...exchangeBody, dtable_server: "https://seatable.example.com/api-gateway/" } },
  ]);
  await assertRejects(
    async () => {
      await apiToken.exchange!({ fields: { apiToken: "t" } }, ctx);
    },
    Error,
    "Only SeaTable Cloud is supported",
  );
});

Deno.test("api-token: a response with no access_token is an error, not a half credential", async () => {
  const { ctx } = mockCtx([{ body: { dtable_uuid: BASE_UUID } }]);
  await assertRejects(() => mint("t", ctx.fetch as never), Error, "no `access_token`");
});

Deno.test("api-token: refresh re-mints from the stored API token and replaces the Base-Token", async () => {
  const fresh = fakeJwt({ exp: EXP + 1000, permission: "rw" });
  const { ctx, calls } = mockCtx([{ body: { ...exchangeBody, access_token: fresh } }]);
  const cred = await apiToken.refresh!(
    { credential: { apiToken: "tok123", accessToken: "old" } },
    ctx,
  ) as {
    accessToken: string;
    apiToken: string;
  };
  assertEquals(calls[0].headers.authorization, "Bearer tok123");
  assertEquals(cred.accessToken, fresh);
  assertEquals(cred.apiToken, "tok123");
});

Deno.test("api-token: refresh with no stored API token is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => {
      await apiToken.refresh!({ credential: {} }, ctx);
    },
    Error,
    "reconnect",
  );
});

Deno.test("api-token: sign stamps the Base-Token, not the API token", () => {
  const out = apiToken.sign!({
    request: { url: "https://cloud.seatable.io/x", method: "GET", headers: {} },
    credential: { apiToken: "api", accessToken: "base" },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(out.headers.authorization, "Bearer base");
});

Deno.test("api-token: test reads base metadata and passes on the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { metadata: { tables: [] } } }]);
  const res = await apiToken.test({ credential: { accessToken: "b", dtableUuid: BASE_UUID } }, ctx);
  assertEquals(res.ok, true);
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/metadata/`);
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("api-token: test fails on a 200 that is not base metadata", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const res = await apiToken.test({ credential: { accessToken: "b", dtableUuid: BASE_UUID } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("not with base metadata"));
});

Deno.test("api-token: test classifies the gateway's invalid-token 403 by body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error_message: "invalid token" } }]);
  const res = await apiToken.test({ credential: { accessToken: "b", dtableUuid: BASE_UUID } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected the Base-Token"));
});

Deno.test("api-token: test treats an unrelated 500 as a failure without blaming the token", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { error_message: "boom" } }]);
  const res = await apiToken.test({ credential: { accessToken: "b", dtableUuid: BASE_UUID } }, ctx);
  assertEquals(res.ok, false);
  assert(!res.message?.includes("rejected"));
});

Deno.test("api-token: test with an incomplete credential makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await apiToken.test({ credential: {} }, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("api-token: test reports a network failure as not ok", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("offline")),
    log: () => {},
  } as unknown as HookContext;
  const res = await apiToken.test({ credential: { accessToken: "b", dtableUuid: BASE_UUID } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("offline"));
});

Deno.test("api-token: afterConnect publishes the base identity and never a token", async () => {
  const out = await apiToken.afterConnect!({
    credential: {
      apiToken: "secret-api",
      accessToken: "secret-base",
      dtableUuid: BASE_UUID,
      dtableName: "My Base",
      workspaceId: 234,
      permission: "r",
    },
  }, mockCtx().ctx);
  assertEquals(out, {
    baseUuid: BASE_UUID,
    baseName: "My Base",
    workspaceId: 234,
    permission: "r",
  });
  assertEquals(JSON.stringify(out).includes("secret"), false);
});

Deno.test("api-token: decodeClaims reads a JWT payload and survives garbage", () => {
  assertEquals(decodeClaims(accessToken).permission, "rw");
  assertEquals(decodeClaims("not-a-jwt"), {});
  assertEquals(decodeClaims(""), {});
});

Deno.test("api-token: a token without exp falls back to the vendor's three-day lifetime", () => {
  const now = Date.UTC(2026, 9, 6);
  const at = Date.parse(expiryOf("garbage", now));
  assertEquals(at, now + 3 * 86_400_000 - 3_600_000);
});

Deno.test("api-token: the API token field is a secret", () => {
  assertEquals(apiToken.fields?.[0].type, "secret");
});
