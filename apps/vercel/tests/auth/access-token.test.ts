import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

Deno.test("access-token: signs with a plain bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.vercel.com/v2/user",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { token: "vercel_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer vercel_abc");
});

Deno.test("access-token: the token is the only secret field, and teamId is optional", () => {
  const secret = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secret, ["token"]);
  // Blank teamId is meaningful — it is Vercel's personal-account default.
  assertEquals(auth.fields!.find((f) => f.key === "teamId")!.required, undefined);
});

Deno.test("access-token: test probes the scope-free whoami", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { user: { username: "acme" } } }]);
  assertEquals(await auth.test!({ credential: { token: "t" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.vercel.com/v2/user");
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

Deno.test("access-token: 403 (Vercel's missing/!valid token answer) reports as rejected", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{
      status,
      body: { error: { code: "forbidden", missingToken: true } },
    }]);
    const result = await auth.test!({ credential: { token: "t" } } as never, ctx) as {
      ok: boolean;
      message: string;
    };
    assertEquals(result.ok, false);
    assert(result.message.includes(String(status)), result.message);
  }
});

Deno.test("access-token: a missing token fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing token",
  });
  assertEquals(calls.length, 0);
});

Deno.test("access-token: afterConnect publishes the team and user, never the token", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { user: { id: "u1", username: "acme", email: "a@b.com", name: "Acme" } },
  }]);
  const display = await auth.afterConnect!(
    { credential: { token: "vercel_secret", teamId: "team_abc" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.teamId, "team_abc");
  assertEquals((display.user as Record<string, unknown>).username, "acme");
  assert(!JSON.stringify(display).includes("vercel_secret"), "the credential leaked into display");
});

Deno.test("access-token: a blank teamId stays absent rather than becoming an empty scope", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!(
    { credential: { token: "t", teamId: "  " } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { teamId: undefined });
});
