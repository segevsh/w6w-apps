import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/personal-access-token.ts";

Deno.test("personal-access-token: is an apiKey method with accountId + accessToken fields", () => {
  assertEquals(auth.key, "personal-access-token");
  assertEquals(auth.type, "apiKey");
  const accountId = auth.fields?.find((f) => f.key === "accountId");
  const accessToken = auth.fields?.find((f) => f.key === "accessToken");
  assert(accountId, "must declare an `accountId` field");
  assert(accessToken, "must declare an `accessToken` field");
  assertEquals(accountId.required, true);
  assertEquals(accessToken.required, true);
  assertEquals(accessToken.type, "secret");
});

Deno.test("personal-access-token: sign stamps Bearer + Harvest-Account-Id", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.harvestapp.com/v2/users/me",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accountId: "12345", accessToken: "tok-abc" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer tok-abc");
  assertEquals(out.headers["harvest-account-id"], "12345");
});

Deno.test("personal-access-token: test hits /users/me with both headers and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const result = await auth.test(
    { credential: { accountId: "12345", accessToken: "tok-abc" } },
    ctx,
  );
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.harvestapp.com");
  assertEquals(url.pathname, "/v2/users/me");
  assertEquals(calls[0].headers["authorization"], "Bearer tok-abc");
  assertEquals(calls[0].headers["harvest-account-id"], "12345");
});

Deno.test("personal-access-token: test reports failure with status code when Harvest rejects", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "not authorized" } }]);
  const result = await auth.test({ credential: { accountId: "1", accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("401"));
});

Deno.test("personal-access-token: test reports failure when a field is missing", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: { accountId: "1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("accountId or accessToken"));
});
