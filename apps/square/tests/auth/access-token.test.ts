import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/access-token.ts";
import { SQUARE_VERSION } from "../../lib/client.ts";
import { mockCtx, optionValues } from "../_helpers.ts";
import type { HookContext } from "@w6w/types";

Deno.test("access-token: is a bearer method with a secret token and an environment field", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const token = auth.fields?.find((f) => f.key === "accessToken");
  assertEquals(token?.type, "secret");
  assertEquals(token?.required, true);

  const env = auth.fields?.find((f) => f.key === "environment");
  assertEquals(env?.type, "select");
  assertEquals(env?.default, "production");
  assertEquals(
    optionValues(env),
    ["production", "sandbox"],
  );
});

Deno.test("access-token: sign stamps the bearer token and nothing else", () => {
  const request = { headers: {} as Record<string, string> };
  const signed = auth.sign!(
    { request, credential: { accessToken: "EAAAtoken" } } as never,
    {} as HookContext,
  ) as { headers: Record<string, string> };
  assertEquals(signed.headers["authorization"], "Bearer EAAAtoken");
  assertEquals(Object.keys(signed.headers), ["authorization"]);
});

Deno.test("access-token: test probes merchants/me with the version header", async () => {
  const { ctx, calls } = mockCtx([{ body: { merchant: { id: "M1" } } }]);
  const result = await auth.test(
    { credential: { accessToken: "EAAAtoken", environment: "production" } },
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://connect.squareup.com/v2/merchants/me");
  assertEquals(calls[0].headers["authorization"], "Bearer EAAAtoken");
  assertEquals(calls[0].headers["square-version"], SQUARE_VERSION);
});

Deno.test("access-token: test uses the sandbox host for a sandbox credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { merchant: {} } }]);
  await auth.test({ credential: { accessToken: "EAAAEtoken", environment: "sandbox" } }, ctx);
  assertEquals(calls[0].url, "https://connect.squareupsandbox.com/v2/merchants/me");
});

Deno.test("access-token: test reports Square's own error detail on failure", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: {
      errors: [{
        category: "AUTHENTICATION_ERROR",
        code: "UNAUTHORIZED",
        detail: "This request could not be authorized.",
      }],
    },
  }]);
  const result = await auth.test({ credential: { accessToken: "nope" } }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "This request could not be authorized.");
});

Deno.test("access-token: test fails closed when the credential has no token", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("accessToken"));
  assertEquals(calls.length, 0);
});

Deno.test("access-token: afterConnect records the environment and host on the connection", async () => {
  const { ctx, calls } = mockCtx([{ body: { merchant: { business_name: "Acme" } } }]);
  const display = await auth.afterConnect!(
    { credential: { environment: "sandbox" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.environment, "sandbox");
  assertEquals(display.apiHost, "connect.squareupsandbox.com");
  assertEquals(display.merchant, { business_name: "Acme" });
  assertEquals(calls[0].url, "https://connect.squareupsandbox.com/v2/merchants/me");
  // afterConnect runs signed by the runtime — it must not stamp auth itself.
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["square-version"], SQUARE_VERSION);
});

Deno.test("access-token: afterConnect still records the environment when the probe fails", async () => {
  const { ctx } = mockCtx([{ status: 500, body: {} }]);
  const display = await auth.afterConnect!(
    { credential: { environment: "production" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.environment, "production");
  assertEquals(display.apiHost, "connect.squareup.com");
});

Deno.test("access-token: an unrecognised environment falls back to production", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const display = await auth.afterConnect!(
    { credential: { environment: "staging" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.environment, "production");
  assertEquals(new URL(calls[0].url).host, "connect.squareup.com");
});
