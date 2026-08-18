import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

const display = { endpoint: "https://sentry.example.com", organizationSlug: "acme" };

Deno.test("site: is an unsigned, connection-scoped dependency check", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
  assertEquals(site.network, undefined);
});

Deno.test("site: a 401 from the unauthenticated probe is the healthy answer", async () => {
  const { ctx, calls } = mockCtx([{
    status: 401,
    body: { detail: "Authentication credentials were not provided." },
  }], {
    display,
  });
  const result = await site.check!({} as never, ctx) as { state: string };
  assertEquals(calls[0].url, "https://sentry.example.com/api/0/organizations/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(result.state, "ok");
});

Deno.test("site: 404 means nothing Sentry-shaped is listening; 5xx means it is broken", async () => {
  const missing = mockCtx([{ status: 404, body: "" }], { display });
  const gone = await site.check!({} as never, missing.ctx) as { state: string; message: string };
  assertEquals(gone.state, "down");
  assertEquals(gone.message, "endpoint does not look like a Sentry install (404)");

  const broken = mockCtx([{ status: 502, body: "" }], { display });
  assertEquals((await site.check!({} as never, broken.ctx) as { state: string }).state, "down");
});

Deno.test("site: another 4xx is degraded rather than fatal", async () => {
  const { ctx } = mockCtx([{ status: 429, body: "" }], { display });
  assertEquals((await site.check!({} as never, ctx) as { state: string }).state, "degraded");
});

Deno.test("site: without an endpoint on the connection it reports unknown, not down", async () => {
  const { ctx, calls } = mockCtx([], { display: { organizationSlug: "acme" } });
  const result = await site.check!({} as never, ctx) as { state: string; message: string };
  assertEquals(result.state, "unknown");
  assertEquals(result.message, "connection records no endpoint");
  assertEquals(calls.length, 0);
});
