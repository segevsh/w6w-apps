import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: points at Sentry's own OAuth endpoints", () => {
  assertEquals(auth.type, "oauth2");
  assertEquals(auth.oauth2!.authorizationUrl, "https://sentry.io/oauth/authorize/");
  assertEquals(auth.oauth2!.tokenUrl, "https://sentry.io/oauth/token/");
  assertEquals(auth.oauth2!.scopeSeparator, " ");
});

Deno.test("oauth2: requests only the scopes this app's actions use", () => {
  // Nothing here is an admin scope — the app deliberately has no
  // organization/team/member write actions to need one.
  const scopes = auth.oauth2!.scopes!;
  assertEquals(scopes.includes("org:read"), true);
  assertEquals(scopes.includes("event:write"), true);
  for (const scope of scopes) assert(!scope.endsWith(":admin"), `unexpected admin scope: ${scope}`);
});

Deno.test("oauth2: signs with the access token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://sentry.io/api/0/organizations/",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test calls the org listing, the narrowest scope it asks for", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://sentry.io/api/0/organizations/");
});

Deno.test("oauth2: a rejected token reports the status", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { detail: "no" } }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), {
    ok: false,
    message: "Sentry returned 401",
  });
});

Deno.test("oauth2: afterConnect adopts a sole organization as the default", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ slug: "acme" }] }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "at" } } as never, ctx), {
    endpoint: "https://sentry.io",
    organizations: ["acme"],
    organizationSlug: "acme",
  });
});

Deno.test("oauth2: with several organizations it records them but picks none", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [{ slug: "acme" }, { slug: "beta" }] }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "at" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.organizations, ["acme", "beta"]);
  assertEquals(display.organizationSlug, undefined);
});

Deno.test("oauth2: a failed lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { accessToken: "at" } } as never, ctx), {
    endpoint: "https://sentry.io",
  });
});
