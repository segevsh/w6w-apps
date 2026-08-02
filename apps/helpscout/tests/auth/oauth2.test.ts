import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: declares Help Scout's fixed authorize/token endpoints", () => {
  assertEquals(auth.key, "oauth2");
  assertEquals(auth.type, "oauth2");
  // Unlike Zendesk, Help Scout has no per-account host — same host for every
  // Connection, confirmed by n8n's HelpScoutOAuth2Api.credentials.ts.
  assertEquals(
    auth.oauth2?.authorizationUrl,
    "https://secure.helpscout.net/authentication/authorizeClientApplication",
  );
  assertEquals(auth.oauth2?.tokenUrl, "https://api.helpscout.net/v2/oauth2/token");
  assertEquals(auth.oauth2?.pkce, false);
  assertEquals(auth.fields, undefined);
});

Deno.test("oauth2: sign sets the Bearer header", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.helpscout.net/v2/conversations",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test refuses a missing token without a request", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals(await auth.test({ credential: {} }, ctx), {
    ok: false,
    message: "credential missing accessToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: test probes GET /v2/users/me, Bearer-signed itself", async () => {
  const ok = mockCtx([{ body: { id: 1 } }]);
  assertEquals(await auth.test({ credential: { accessToken: "tok" } }, ok.ctx), { ok: true });
  assertEquals(ok.calls[0].url, "https://api.helpscout.net/v2/users/me");
  assertEquals(ok.calls[0].headers["authorization"], "Bearer tok");
});

Deno.test("oauth2: test surfaces a non-2xx status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  assertEquals(await auth.test({ credential: { accessToken: "bad" } }, ctx), {
    ok: false,
    message: "Help Scout returned 401",
  });
});

Deno.test("oauth2: afterConnect records the user for connectionLabel", async () => {
  const { ctx, calls } = mockCtx([{
    body: { id: 4, firstName: "Vernon", lastName: "Bear", email: "bear@acme.com" },
  }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out, {
    user: { id: 4, firstName: "Vernon", lastName: "Bear", email: "bear@acme.com" },
  });
  assertEquals(calls[0].url, "https://api.helpscout.net/v2/users/me");
});

Deno.test("oauth2: afterConnect degrades to {} when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const out = await auth.afterConnect!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out, {});
});
