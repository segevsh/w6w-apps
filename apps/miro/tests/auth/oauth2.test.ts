import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: uses the endpoints Miro's own security scheme names", () => {
  assertEquals(auth.oauth2!.authorizationUrl, "https://miro.com/oauth/authorize");
  assertEquals(auth.oauth2!.tokenUrl, "https://api.miro.com/v1/oauth/token");
  assertEquals(auth.oauth2!.refreshUrl, "https://api.miro.com/v1/oauth/token");
});

Deno.test("oauth2: asks for the two board scopes and no enterprise or iframe ones", () => {
  assertEquals(auth.oauth2!.scopes, ["boards:read", "boards:write"]);
  for (const s of auth.oauth2!.scopes!) {
    assert(!s.startsWith("organizations:"), `unexpected enterprise scope: ${s}`);
  }
});

Deno.test("oauth2: is the only auth method Miro offers", () => {
  // The OpenAPI document declares exactly one security scheme, oAuth2AuthCode.
  assertEquals(auth.type, "oauth2");
});

Deno.test("oauth2: signs with the access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.miro.com/v2/boards",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test introspects the token, needing no board scope", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user: { id: "u1" } } }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.miro.com/v1/oauth-token");
});

Deno.test("oauth2: a rejected token says so", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { code: "tokenNotProvided" } }]);
  const result = await auth.test!({ credential: { accessToken: "at" } } as never, ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(result.ok, false);
  assert(result.message.includes("401"), result.message);
});

Deno.test("oauth2: afterConnect records the granted scopes, not just the asked-for ones", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      user: { id: "u1", name: "Ann" },
      team: { id: "t1", name: "Acme" },
      scopes: ["boards:read"],
    },
  }]);
  const display = await auth.afterConnect!({} as never, ctx) as Record<string, unknown>;
  assertEquals((display.user as Record<string, unknown>).name, "Ann");
  // Granted is often less than requested; an operator needs to see which.
  assertEquals(display.scopes, ["boards:read"]);
});

Deno.test("oauth2: a failed lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({} as never, ctx), {});
});
