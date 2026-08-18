import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/auth-token.ts";

Deno.test("auth-token: signs with a plain bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://us.sentry.io/api/0/organizations/",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "sntrys_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer sntrys_abc");
});

Deno.test("auth-token: the token is only ever handled by sign/test, never a field default", () => {
  const secretFields = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secretFields, ["token"]);
  assertEquals(auth.fields!.find((f) => f.key === "token")!.default, undefined);
});

Deno.test("auth-token: test probes the named organization, not just the token", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { slug: "acme" } }]);
  const result = await auth.test!(
    { credential: { token: "t", organizationSlug: "acme" } } as never,
    ctx,
  );
  assertEquals(result, { ok: true });
  assertEquals(calls[0].url, "https://us.sentry.io/api/0/organizations/acme/?detailed=0");
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("auth-token: test honours a self-hosted endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await auth.test!(
    {
      credential: {
        token: "t",
        organizationSlug: "acme",
        endpoint: "https://sentry.example.com/",
      },
    } as never,
    ctx,
  );
  assertEquals(calls[0].url, "https://sentry.example.com/api/0/organizations/acme/?detailed=0");
});

Deno.test("auth-token: each failure mode gets its own message", async () => {
  for (
    const [status, needle] of [[401, "401"], [403, "403"], [404, "404"], [500, "500"]] as const
  ) {
    const { ctx } = mockCtx([{ status, body: { detail: "nope" } }]);
    const result = await auth.test!(
      { credential: { token: "t", organizationSlug: "acme" } } as never,
      ctx,
    ) as { ok: boolean; message?: string };
    assertEquals(result.ok, false);
    assert(result.message!.includes(needle), `${status}: ${result.message}`);
  }
});

Deno.test("auth-token: a missing token or org fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing token",
  });
  assertEquals(await auth.test!({ credential: { token: "t" } } as never, ctx), {
    ok: false,
    message: "credential missing organizationSlug",
  });
  assertEquals(calls.length, 0);
});

Deno.test("auth-token: afterConnect publishes the org and endpoint, never the token", async () => {
  const display = await auth.afterConnect!(
    {
      credential: { token: "sntrys_secret", organizationSlug: "acme", endpoint: "" },
    } as never,
    null as never,
  );
  assertEquals(display, { organizationSlug: "acme", endpoint: "https://us.sentry.io" });
  assert(!JSON.stringify(display).includes("sntrys_secret"), "the credential leaked into display");
});
