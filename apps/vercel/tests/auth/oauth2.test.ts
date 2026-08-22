import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: points at the endpoints Vercel's schema names", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2!.authorizationUrl, "https://api.vercel.com/oauth/authorize");
  assertEquals(auth.oauth2!.tokenUrl, "https://api.vercel.com/oauth/access_token");
});

Deno.test("oauth2: declares no scopes, because Vercel's flow has none", () => {
  // The schema's authorizationCode flow carries `"scopes": {}` — an
  // integration's reach comes from its configuration, not this request.
  // Inventing scope names would put them on the wire for Vercel to reject.
  assertEquals(auth.oauth2!.scopes, undefined);
});

Deno.test("oauth2: signs with the access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.vercel.com/v2/user",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test calls the whoami", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user: {} } }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.vercel.com/v2/user");
});

Deno.test("oauth2: a rejected token reports the status", async () => {
  const { ctx } = mockCtx([{ status: 403, body: {} }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), {
    ok: false,
    message: "Vercel returned 403",
  });
});

Deno.test("oauth2: afterConnect adopts the installation's team when Vercel sent one", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { user: { id: "u1", username: "acme" } } }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "at", teamId: "team_abc" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.teamId, "team_abc");
  assertEquals((display.user as Record<string, unknown>).username, "acme");
});

Deno.test("oauth2: a failed lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "at" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { teamId: undefined });
  assert(!("user" in display));
});
