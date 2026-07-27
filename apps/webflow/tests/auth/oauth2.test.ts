import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Webflow's authorize/token endpoints with space-separated scopes", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2?.authorizationUrl, "https://webflow.com/oauth/authorize");
  assertEquals(auth.oauth2?.tokenUrl, "https://api.webflow.com/oauth/access_token");
  assertEquals(auth.oauth2?.scopeSeparator, " ");
  assertEquals(auth.oauth2?.pkce, false);
  assert(auth.oauth2?.scopes?.includes("cms:write"));
});

Deno.test("oauth2: sign appends Bearer using credential.accessToken", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at-123" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at-123");
});

Deno.test("oauth2: test hits /v2/sites and reports ok", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sites: [] } }]);
  const result = await auth.test({ credential: { accessToken: "at-123" } }, ctx);
  assertEquals(result.ok, true);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/sites");
  assertEquals(calls[0].headers["authorization"], "Bearer at-123");
});

Deno.test("oauth2: test reports missing token without a fetch", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect reads the authorized user for the label", async () => {
  const user = { id: "u1", firstName: "Ada", lastName: "Lovelace", email: "ada@x.io" };
  const { ctx, calls } = mockCtx([{ status: 200, body: user }]);
  const result = await auth.afterConnect!({ credential: { accessToken: "at-123" } }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v2/token/authorized_by");
  assertEquals(result, { user });
});
