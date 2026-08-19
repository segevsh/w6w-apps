import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

const credential = { host: "https://nocodb.internal", token: "tok" };
const bases = {
  status: 200,
  body: { list: [{ title: "CRM" }, { title: "Ops" }] },
  headers: { "x-ratelimit-limit": "60", "x-ratelimit-remaining": "58" },
};

Deno.test("api-token: signs with the xc-token header", () => {
  const request = { url: "https://x", headers: {} as Record<string, string> };
  const signed = auth.sign!({ request, credential } as never, mockCtx([]).ctx) as typeof request;
  assertEquals(signed.headers["xc-token"], "tok");
  assertEquals(signed.headers["xc-auth"], undefined, "the session header is the one that expires");
});

Deno.test("api-token: exchange normalises the host once", () => {
  const stored = auth.exchange!(
    { fields: { host: "nocodb.internal/api/v2", token: "tok" } },
    mockCtx([]).ctx,
  ) as Record<string, unknown>;
  assertEquals(stored.host, "https://nocodb.internal");
  assertThrows(
    () => auth.exchange!({ fields: { host: "x" } }, mockCtx([]).ctx),
    Error,
    "`token` is required",
  );
});

/** /api/v1/health needs no credential, so it cannot test one. */
Deno.test("api-token: tests against an authenticated endpoint, not health", async () => {
  const { ctx, calls } = mockCtx([bases]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(calls[0].url, "https://nocodb.internal/api/v2/meta/bases");
  assert(!calls.some((call) => call.url.includes("health")), "it must not probe /health");
  assertEquals(result.ok, true);
  assert(/2 bases visible/.test(result.message!), result.message);
});

/** The budget is small enough to be worth reporting at connect time. */
Deno.test("api-token: the test reports the rate limit it saw", async () => {
  const { ctx } = mockCtx([bases]);
  const result = await auth.test!({ credential } as never, ctx);
  assert(/60 requests a minute \(58 left/.test(result.message!), result.message);
});

Deno.test("api-token: a rejected token explains the two headers", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "ERR_AUTHENTICATION_REQUIRED", message: "Invalid token" },
  }]);
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/`xc-auth` and expires/.test(result.message!), result.message);
});

Deno.test("api-token: an unreachable host fails rather than throwing", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const result = await auth.test!({ credential } as never, ctx);
  assertEquals(result.ok, false);
  assert(/could not reach/.test(result.message!), result.message);
});

/** The info endpoint is unauthenticated and carries the version. */
Deno.test("api-token: afterConnect records the version and edition, never the token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { version: "0.111.4", ee: true } }]);
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://nocodb.internal/api/v2/meta/nocodb/info");
  assertEquals(display.version, "0.111.4");
  assertEquals(display.edition, "cloud or enterprise");
  assertEquals(display.hostLabel, "nocodb.internal");
  assert(!JSON.stringify(display).includes('"tok"'), JSON.stringify(display));
});

Deno.test("api-token: afterConnect survives an instance that will not answer", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("dns")),
    log: () => {},
  } as unknown as Parameters<NonNullable<typeof auth.test>>[1];
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.version, "");
  assertEquals(display.edition, "open source");
});

Deno.test("api-token: is declared as an xc-token header key", () => {
  assertEquals(auth.apiKey, { in: "header", name: "xc-token" });
  assert(/EXPIRES/.test(auth.description!), auth.description);
});
