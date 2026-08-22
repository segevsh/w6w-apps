import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import production from "../../auth/oauth2.ts";
import demo from "../../auth/oauth2-demo.ts";

Deno.test("oauth2: the two environments are separate installations", () => {
  assertEquals(production.key, "oauth2");
  assertEquals(demo.key, "oauth2-demo");
  assertEquals(production.oauth2!.authorizationUrl, "https://api.gusto.com/oauth/authorize");
  assertEquals(demo.oauth2!.authorizationUrl, "https://api.gusto-demo.com/oauth/authorize");
  assertEquals(production.oauth2!.tokenUrl, "https://api.gusto.com/oauth/token");
  // The same endpoint refreshes — and hands back a NEW single-use token.
  assertEquals(production.oauth2!.refreshUrl, production.oauth2!.tokenUrl);
});

/**
 * Gusto's OAuth flow takes no scope parameter — permissions are configured on
 * the developer app — so claiming scopes would send something Gusto ignores.
 */
Deno.test("oauth2: requests no scopes, deliberately", () => {
  assertEquals(production.oauth2!.scopes, undefined);
  assert(production.oauth2!.pkce, "PKCE should be on");
});

Deno.test("oauth2: signs as a Bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.gusto.com/v1/token_info",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await production.sign!({ request, credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

/** token_info needs no company id and no permission. */
Deno.test("oauth2: test uses the introspection route", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { resource: { type: "Company" } } }]);
  const out = await production.test!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/v1/token_info");
  assertEquals(calls[0].headers["x-gusto-api-version"], "2026-06-15");
});

Deno.test("oauth2: the demo method calls the demo host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await demo.test!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(new URL(calls[0].url).host, "api.gusto-demo.com");
});

/** After two hours, a 401 nearly always means the refresh did not happen. */
Deno.test("oauth2: a 401 explains the two-hour token and single-use refresh", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const out = await production.test!({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(out.ok, false);
  assert(/two hours/.test(out.message!), out.message);
  assert(/single-use/.test(out.message!), out.message);
});

Deno.test("oauth2: a missing token never reaches the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await production.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("oauth2: afterConnect records the environment and company", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: {
      resource: { type: "Company", uuid: "co-1" },
      companies: [{ uuid: "co-1", name: "Acme" }],
    },
  }]);
  const display = await production.afterConnect!({ credential: { accessToken: "tok" } }, ctx) as {
    environment: string;
    companyId: string;
    companyName: string;
  };
  assertEquals(display.environment, "production");
  assertEquals(display.companyId, "co-1");
  assertEquals(display.companyName, "Acme");
});

Deno.test("oauth2: an explicit company wins over the first one", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { companies: [{ uuid: "co-1", name: "Acme" }, { uuid: "co-2", name: "Beta" }] },
  }]);
  const display = await production.afterConnect!(
    { credential: { accessToken: "tok", companyId: "co-2" } },
    ctx,
  ) as { companyId: string; companyName: string };
  assertEquals(display.companyId, "co-2");
  assertEquals(display.companyName, "Beta");
});
