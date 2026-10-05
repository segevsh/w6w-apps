import { assertEquals, assertRejects } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import { BASE, mockCtx, nsError } from "../_helpers.ts";

const req = (url: string) => ({ url, method: "GET", headers: {} as Record<string, string> });

Deno.test("oauth2: URLs carry the account placeholder, PKCE and the REST scope", () => {
  const o = oauth2.oauth2!;
  assertEquals(o.authorizationUrl.includes("{accountId}.app.netsuite.com"), true);
  assertEquals(o.tokenUrl.includes("{accountId}.suitetalk.api.netsuite.com"), true);
  assertEquals(o.scopes, ["rest_webservices"]);
  assertEquals(o.pkce, true);
});

Deno.test("oauth2: sign sets a bearer header on a SuiteTalk host", async () => {
  const out = await oauth2.sign!({
    request: req(`${BASE}/services/rest/record/v1/customer`),
    credential: { accessToken: "tok" },
  } as never, {} as never);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: sign refuses any other host", async () => {
  await assertRejects(
    async () =>
      await oauth2.sign!({
        request: req("https://evil.example.com/x"),
        credential: { accessToken: "tok" },
      } as never, {} as never),
    Error,
    "non-SuiteTalk",
  );
});

Deno.test("oauth2: test passes on serverTime", async () => {
  const { ctx, calls } = mockCtx([{ body: { serverTime: "2025-03-26T16:21:00.000Z" } }]);
  const r = await oauth2.test!(
    { credential: { accountId: "1234567", accessToken: "t" } } as never,
    ctx,
  );
  assertEquals(r, { ok: true });
  assertEquals(calls[0].url, `${BASE}/services/rest/system/v1/serverTime`);
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("oauth2: test classifies a failure from the body, not the status", async () => {
  const { ctx } = mockCtx([nsError(401, "INVALID_LOGIN", "Invalid login attempt.")]);
  const r = await oauth2.test!(
    { credential: { accountId: "1234567", accessToken: "t" } } as never,
    ctx,
  );
  assertEquals(r.ok, false);
  assertEquals(r.message?.startsWith("INVALID_LOGIN"), true);
});

Deno.test("oauth2: test refuses a missing token or hostile account id without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await oauth2.test!({ credential: { accountId: "1" } } as never, ctx)).ok, false);
  assertEquals(
    (await oauth2.test!(
      { credential: { accountId: "a.evil.com/", accessToken: "t" } } as never,
      ctx,
    )).ok,
    false,
  );
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect records the normalised account id", async () => {
  const out = await oauth2.afterConnect!(
    { credential: { accountId: "1234567-SB1" } } as never,
    {} as never,
  );
  assertEquals(out, { accountId: "1234567-sb1" });
});
