import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";

Deno.test("api-token: signs as a bearer token, which the spec spells out", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.replicate.com/v1/account",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "r8_abc" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer r8_abc");
  assertEquals(auth.type, "bearer");
});

Deno.test("api-token: the token is a secret field with no default", () => {
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["apiToken"]);
  assertEquals(auth.fields!.find((f) => f.key === "apiToken")!.default, undefined);
});

/** A Replicate token is unscoped and spends money — worth saying. */
Deno.test("api-token: the description says the token is unscoped", () => {
  assert(auth.description!.includes("no scoped tokens"), auth.description);
});

Deno.test("api-token: test probes the account endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { username: "ada" } }]);
  assertEquals(await auth.test!({ credential: { apiToken: "t" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.replicate.com/v1/account");
});

Deno.test("api-token: a rejected token says so; another status reports itself", async () => {
  const rejected = mockCtx([{ status: 401, body: { title: "Unauthenticated" } }]);
  assertEquals(await auth.test!({ credential: { apiToken: "t" } } as never, rejected.ctx), {
    ok: false,
    message: "Replicate rejected the token (401)",
  });
  const other = mockCtx([{ status: 503, body: "" }]);
  assertEquals(await auth.test!({ credential: { apiToken: "t" } } as never, other.ctx), {
    ok: false,
    message: "Replicate returned 503",
  });
});

Deno.test("api-token: a missing token fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect publishes the account, never the token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { username: "ada", type: "user" } }]);
  const display = await auth.afterConnect!(
    { credential: { apiToken: "r8_supersecret" } } as never,
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display, { username: "ada", accountType: "user" });
  assert(!JSON.stringify(display).includes("supersecret"), "the credential leaked into display");
});

Deno.test("api-token: a failed lookup still connects", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { apiToken: "t" } } as never, ctx), {});
});
