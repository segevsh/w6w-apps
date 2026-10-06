import { assert, assertEquals } from "@std/assert";
import oauth2 from "../../auth/oauth2.ts";
import oauth2Eu1 from "../../auth/oauth2-eu1.ts";
import oauth2Demo from "../../auth/oauth2-demo.ts";
import { SCOPES } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("oauth2: each environment points at its own authorize and token hosts", () => {
  const cases: Array<[typeof oauth2, string, string]> = [
    [oauth2, "oauth2", "ironcladapp.com"],
    [oauth2Eu1, "oauth2-eu1", "eu1.ironcladapp.com"],
    [oauth2Demo, "oauth2-demo", "demo.ironcladapp.com"],
  ];
  for (const [auth, key, host] of cases) {
    assertEquals(auth.key, key);
    assertEquals(auth.type, "oauth2");
    assertEquals(auth.oauth2?.authorizationUrl, `https://${host}/oauth/authorize`);
    assertEquals(auth.oauth2?.tokenUrl, `https://${host}/oauth/token`);
    assertEquals(auth.oauth2?.refreshUrl, `https://${host}/oauth/token`);
    assertEquals(auth.oauth2?.scopes, SCOPES);
  }
});

Deno.test("oauth2: sign stamps the bearer token and nothing else", async () => {
  const req = {
    url: "https://ironcladapp.com/public/api/v1/workflows",
    method: "GET",
    headers: {},
  };
  const out = await oauth2.sign!(
    { request: req, credential: { accessToken: "tok" } } as never,
    {} as never,
  );
  assertEquals((out as typeof req).headers, { authorization: "Bearer tok" });
});

Deno.test("oauth2: test passes on a userinfo body and never sends the token in the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1", email: "a@b.co", companyName: "Acme" } }]);
  const out = await oauth2.test!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(out.ok, true);
  assertEquals(calls[0].url, "https://ironcladapp.com/oauth/userinfo");
  assert(!calls[0].url.includes("tok"));
});

Deno.test("oauth2: test classifies a rejected token from the body code and does not echo it", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "UNAUTHORIZED", message: "invalid authentication token" },
  }]);
  const out = await oauth2.test!({ credential: { accessToken: "super-secret-tok" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(!String(out.message).includes("super-secret-tok"));
});

Deno.test("oauth2: a 200 that is not a userinfo body is not a pass", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  const out = await oauth2.test!({ credential: { accessToken: "t" } } as never, ctx);
  assertEquals(out.ok, false);
});

Deno.test("oauth2: test without an access token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await oauth2.test!({ credential: {} } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect records region, company and user", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: "u1", email: "a@b.co", displayName: "Ann", companyName: "Acme" },
  }]);
  const out = await oauth2Eu1.afterConnect!({ credential: { accessToken: "t" } } as never, ctx);
  assertEquals(calls[0].url, "https://eu1.ironcladapp.com/oauth/userinfo");
  assertEquals(out, {
    region: "eu1",
    regionLabel: "EU production",
    companyName: "Acme",
    userEmail: "a@b.co",
    userName: "Ann",
  });
});
