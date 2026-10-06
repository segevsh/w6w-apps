import { assert, assertEquals } from "@std/assert";
import oauth2, { PROBE_PATH } from "../../auth/oauth2.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const TOKEN = "unitTestFixtureNotARealToken";

Deno.test("oauth2: declares the documented authorize/token/refresh URLs", () => {
  const o = oauth2.oauth2!;
  assertEquals(o.authorizationUrl, "https://app.mural.co/api/public/v1/authorization/oauth2");
  assertEquals(o.tokenUrl, "https://app.mural.co/api/public/v1/authorization/oauth2/token");
  assertEquals(o.refreshUrl, o.tokenUrl);
});

Deno.test("oauth2: sign stamps the bearer header and leaves the URL alone", () => {
  const request = {
    method: "GET",
    url: "https://app.mural.co/api/public/v1/users/me",
    headers: {} as Record<string, string>,
  };
  const signed = oauth2.sign!({ request, credential: { accessToken: TOKEN } }, {} as never) as {
    url: string;
    headers: Record<string, string>;
  };
  assertEquals(signed.headers.authorization, `Bearer ${TOKEN}`);
  assert(!signed.url.includes(TOKEN));
});

Deno.test("oauth2: test passes when the probe answers", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: { id: "u1" } } }]);
  assertEquals(await oauth2.test({ credential: { accessToken: TOKEN } }, ctx), { ok: true });
  assertEquals(PROBE_PATH, "/users/me");
  assertEquals(pathOf(calls[0].url), "/api/public/v1/users/me");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("oauth2: test fails with no token and makes no request", async () => {
  const { ctx, calls } = mockCtx([]);
  const r = await oauth2.test({ credential: {} }, ctx);
  assertEquals(r.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: UNAUTHORIZED and TOKEN_EXPIRED bodies mean the credential is rejected", async () => {
  for (const code of ["UNAUTHORIZED", "TOKEN_EXPIRED"]) {
    const { ctx } = mockCtx([{ status: 401, body: { code, message: "x" } }]);
    const r = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
    assertEquals(r.ok, false);
    assert(r.message!.includes(code));
    assert(r.message!.includes("rejected"));
  }
});

Deno.test("oauth2: any other error is reported with its code, not as a rejection", async () => {
  const { ctx } = mockCtx([{
    status: 500,
    body: { code: "INTERNAL_SERVER_ERROR", message: "boom" },
  }]);
  const r = await oauth2.test({ credential: { accessToken: TOKEN } }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("HTTP 500"));
  assert(r.message!.includes("INTERNAL_SERVER_ERROR"));
  assert(!r.message!.includes("rejected"));
});

Deno.test("oauth2: afterConnect labels the connection with the user's name", async () => {
  const { ctx } = mockCtx([{ body: { value: { firstName: "Ada", lastName: "Lovelace" } } }]);
  assertEquals(await oauth2.afterConnect!({} as never, ctx), { user: { name: "Ada Lovelace" } });
  const bad = mockCtx([{ status: 403, body: { code: "X", message: "m" } }]);
  assertEquals(await oauth2.afterConnect!({} as never, bad.ctx), {});
});
