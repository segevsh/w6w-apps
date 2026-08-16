import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("oauth2: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.linkedin.com/rest/adAccounts",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: "tok" } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };

  assertEquals(signed.headers.authorization, "Bearer tok");
  assertEquals(signed.url, "https://api.linkedin.com/rest/adAccounts");
});

Deno.test("oauth2: requests rw_ads and r_ads_reporting, no PKCE", () => {
  assertEquals(oauth2.oauth2?.scopes, ["rw_ads", "r_ads_reporting"]);
  assertEquals(oauth2.oauth2?.pkce, false);
});

Deno.test("oauth2: test fails with no credential, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test passes when the accounts finder answers 200", async () => {
  const { ctx, calls } = mockCtx([{ body: { elements: [] } }]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts");
  assertEquals(calls[0].headers.authorization, "Bearer tok");
});

Deno.test("oauth2: an empty elements array (no mapped accounts yet) still passes", async () => {
  const { ctx } = mockCtx([{ body: { elements: [], metadata: {} } }]);
  assertEquals((await oauth2.test({ credential: { accessToken: "tok" } }, ctx)).ok, true);
});

Deno.test("oauth2: a 403 is reported as a program-approval problem, not a bad credential", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("ACCESS_DENIED", "Not enough permissions"),
  }]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(result.ok, false);
  assert(/Advertising API program/i.test(result.message ?? ""), result.message);
  assert(/Technical Sign Off/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: a 401 is reported as a rejected token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("INVALID_ACCESS_TOKEN", "Invalid access token"),
  }]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
  assert(/INVALID_ACCESS_TOKEN/.test(result.message ?? ""), result.message);
});

Deno.test("oauth2: a 500 is reported as an HTTP failure, not confused for the 403 case", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "upstream exploded" }]);
  const result = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(result.ok, false);
  assert(/500/.test(result.message ?? ""), result.message);
  assert(!/Advertising API program/i.test(result.message ?? ""), result.message);
});
