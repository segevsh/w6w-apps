import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Harvest's real authorize/token hosts and a required accountId field", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://id.getharvest.com/oauth2/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://id.getharvest.com/api/v2/oauth2/token");
  const accountId = auth.fields?.find((f) => f.key === "accountId");
  assert(accountId, "must declare an `accountId` field");
  assertEquals(accountId.required, true);
});

Deno.test("oauth2: sign stamps Bearer + Harvest-Account-Id", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.harvestapp.com/v2/users/me",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!(
    { request, credential: { accountId: "999", accessToken: "oauth-tok" } },
    ctx,
  );
  assertEquals(out.headers["authorization"], "Bearer oauth-tok");
  assertEquals(out.headers["harvest-account-id"], "999");
});

Deno.test("oauth2: test needs both accountId and accessToken", async () => {
  const { ctx } = mockCtx();
  const result = await auth.test({ credential: { accessToken: "t" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("accountId or accessToken"));
});

Deno.test("oauth2: test hits /users/me and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  const result = await auth.test(
    { credential: { accountId: "999", accessToken: "oauth-tok" } },
    ctx,
  );
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/users/me");
  assertEquals(calls[0].headers["harvest-account-id"], "999");
});

Deno.test("oauth2: afterConnect calls the accounts-discovery endpoint with only the bearer token", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      user: { first_name: "Ada", last_name: "Lovelace" },
      accounts: [
        { id: 999, name: "Analytical Engines Inc", product: "harvest" },
        { id: 1000, name: "Analytical Engines Inc", product: "forecast" },
      ],
    },
  }]);
  const out = await auth.afterConnect!({
    credential: { accountId: "999", accessToken: "oauth-tok" },
  }, ctx);
  assertEquals(calls[0].url, "https://id.getharvest.com/api/v2/accounts");
  assertEquals(calls[0].headers["authorization"], "Bearer oauth-tok");
  assertEquals(calls[0].headers["harvest-account-id"], undefined);
  assertEquals((out as { user?: { first_name?: string } }).user?.first_name, "Ada");
  assertEquals((out as { account?: { name?: string } }).account?.name, "Analytical Engines Inc");
});

Deno.test("oauth2: afterConnect returns {} when there is no access token yet", async () => {
  const { ctx, calls } = mockCtx();
  const out = await auth.afterConnect!({ credential: {} }, ctx);
  assertEquals(out, {});
  assertEquals(calls.length, 0);
});
