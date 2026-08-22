import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/oauth2.ts";

Deno.test("oauth2: uses Google's identity endpoints with offline access", () => {
  assertEquals(auth.oauth2!.authorizationUrl, "https://accounts.google.com/o/oauth2/v2/auth");
  assertEquals(auth.oauth2!.tokenUrl, "https://oauth2.googleapis.com/token");
  assertEquals(auth.oauth2!.refreshUrl, "https://oauth2.googleapis.com/token");
  // Without both of these Google does not reliably return a refresh token.
  assertEquals(auth.oauth2!.extraAuthParams?.access_type, "offline");
  assertEquals(auth.oauth2!.extraAuthParams?.prompt, "consent");
  assertEquals(auth.oauth2!.pkce, true);
});

Deno.test("oauth2: asks for the two GA4 scopes and not the legacy UA one", () => {
  assertEquals(auth.oauth2!.scopes, [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/analytics.edit",
  ]);
  // The bare `analytics` scope is Universal Analytics' and grants more than
  // this app uses.
  assert(!auth.oauth2!.scopes!.includes("https://www.googleapis.com/auth/analytics"));
});

Deno.test("oauth2: signs with the bearer", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://analyticsdata.googleapis.com/v1beta/properties/1:runReport",
    method: "POST" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { accessToken: "at" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer at");
});

Deno.test("oauth2: test probes the one endpoint that needs no ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { accountSummaries: [] } }]);
  assertEquals(await auth.test!({ credential: { accessToken: "at" } } as never, ctx), { ok: true });
  assertEquals(
    calls[0].url,
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=1",
  );
});

Deno.test("oauth2: 401 and 403 are different problems and say so", async () => {
  const unauth = mockCtx([{ status: 401, body: "" }]);
  const a = await auth.test!({ credential: { accessToken: "at" } } as never, unauth.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(a.ok, false);
  assert(a.message.includes("401"), a.message);

  // 403 here usually means the API is not enabled on the Cloud project, which
  // is a completely different fix from a bad token.
  const forbidden = mockCtx([{ status: 403, body: "" }]);
  const b = await auth.test!({ credential: { accessToken: "at" } } as never, forbidden.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(b.ok, false);
  assert(b.message.includes("not enabled"), b.message);
});

Deno.test("oauth2: afterConnect records the property and labels it", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      displayName: "Acme Web",
      timeZone: "America/New_York",
      currencyCode: "USD",
      account: "accounts/999",
    },
  }]);
  const display = await auth.afterConnect!(
    { credential: { accessToken: "at", propertyId: "properties/123" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://analyticsadmin.googleapis.com/v1beta/properties/123");
  assertEquals(display.propertyId, "123");
  assertEquals(display.propertyName, "Acme Web");
  assertEquals(display.timeZone, "America/New_York");
});

Deno.test("oauth2: a failed lookup still records the id actions cannot work without", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(
    await auth.afterConnect!(
      { credential: { accessToken: "at", propertyId: "123" } } as never,
      ctx,
    ),
    { propertyId: "123" },
  );
});
