import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { OAUTH_AUTHORIZE_URL, OAUTH_TOKEN_URL, WHOAMI_PATH } from "../../lib/client.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: uses the vendor's documented authorize/token endpoints, with PKCE", () => {
  assertEquals(oauth2.oauth2?.authorizationUrl, OAUTH_AUTHORIZE_URL);
  assertEquals(oauth2.oauth2?.tokenUrl, OAUTH_TOKEN_URL);
  assertEquals(oauth2.oauth2?.pkce, true);
});

Deno.test("oauth2: declares no fields — client id/secret live in the platform's oauth-config", () => {
  assertEquals(oauth2.fields, undefined);
});

Deno.test("oauth2: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://platform.ringcentral.com/x",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: "tok" } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer tok");
  assertEquals(signed.url, "https://platform.ringcentral.com/x");
});

Deno.test("oauth2: test passes when the whoami answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Alice", extensionNumber: "101" } }]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), WHOAMI_PATH);
});

Deno.test("oauth2: test fails without a request when accessToken is missing", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test surfaces a rejected token distinctly from a permission refusal", async () => {
  const { ctx } = mockCtx([
    { status: 401, body: errorBody("TokenInvalid", "OAuth token is invalid") },
  ]);
  const result = await oauth2.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: afterConnect publishes name/extensionNumber/accountId only", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        id: "1",
        name: "Alice Smith",
        extensionNumber: "101",
        account: { id: "999" },
        contact: { email: "alice@example.com" },
      },
    },
  ]);
  const display = await oauth2.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(pathOf(calls[0].url), WHOAMI_PATH);
  assertEquals(display, { name: "Alice Smith", extensionNumber: "101", accountId: "999" });
  assert(!JSON.stringify(display).includes("alice@example.com"));
});

Deno.test("oauth2: has no exchange/refresh — the host manages the standard oauth2 flow", () => {
  assertEquals(oauth2.exchange, undefined);
  assertEquals(oauth2.refresh, undefined);
});
