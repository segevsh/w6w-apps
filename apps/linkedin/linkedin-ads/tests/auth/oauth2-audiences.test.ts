import { assert, assertEquals } from "@std/assert";
import oauth2Audiences from "../../auth/oauth2-audiences.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("oauth2-audiences: sign stamps the bearer header and nothing else", () => {
  const request = {
    method: "GET",
    url: "https://api.linkedin.com/rest/dmpSegments",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2Audiences.sign!(
    { request, credential: { accessToken: "tok" } },
    {} as never,
  ) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, "Bearer tok");
});

Deno.test("oauth2-audiences: requests rw_ads and rw_dmp_segments, no PKCE", () => {
  assertEquals(oauth2Audiences.oauth2?.scopes, ["rw_ads", "rw_dmp_segments"]);
  assertEquals(oauth2Audiences.oauth2?.pkce, false);
});

Deno.test("oauth2-audiences: test fails with no credential, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await oauth2Audiences.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2-audiences: test passes when the segment finder answers 200, probing with a placeholder account", async () => {
  const { ctx, calls } = mockCtx([{
    body: { elements: [], paging: { start: 0, count: 10, total: 0 } },
  }]);
  const result = await oauth2Audiences.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(result, { ok: true });
  assertEquals(pathOf(calls[0].url), "/rest/dmpSegments");
  assertEquals(queryOf(calls[0].url).q, "account");
  assertEquals(queryOf(calls[0].url).account, "urn:li:sponsoredAccount:0");
  assertEquals(calls[0].headers.authorization, "Bearer tok");
});

Deno.test("oauth2-audiences: a 403 is reported as an Audiences-program approval problem", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: errorBody("ACCESS_DENIED", "Not enough permissions"),
  }]);
  const result = await oauth2Audiences.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(result.ok, false);
  assert(/Audiences program/i.test(result.message ?? ""), result.message);
});

Deno.test("oauth2-audiences: a 401 is reported as a rejected token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("INVALID_ACCESS_TOKEN", "Invalid access token"),
  }]);
  const result = await oauth2Audiences.test({ credential: { accessToken: "tok" } }, ctx);

  assertEquals(result.ok, false);
  assert(/rejected the access token/i.test(result.message ?? ""), result.message);
});
