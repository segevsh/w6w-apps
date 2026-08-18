import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-token.ts";
import { PRODUCTION, SANDBOX } from "../../lib/client.ts";

Deno.test("api-token: signs with a plain bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://api.letsdeel.com/rest/contracts",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: { apiToken: "tok" } }, ctx);
  assertEquals(out.headers["authorization"], "Bearer tok");
});

Deno.test("api-token: the token is the only secret, and environment is a choice", () => {
  const secret = auth.fields!.filter((f) => f.type === "secret").map((f) => f.key);
  assertEquals(secret, ["apiToken"]);
  const env = auth.fields!.find((f) => f.key === "environment")!;
  assertEquals(env.default, "production");
  const opts = env.options as Array<{ value: unknown }>;
  assertEquals(opts.map((o) => o.value), ["production", "sandbox"]);
});

Deno.test("api-token: test probes the production host by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  assertEquals(await auth.test!({ credential: { apiToken: "t" } } as never, ctx), { ok: true });
  assertEquals(calls[0].url, `${PRODUCTION}/contracts?limit=1`);
  assertEquals(calls[0].headers["authorization"], "Bearer t");
});

/** Tokens are not shared between environments, so the probe must follow it. */
Deno.test("api-token: test follows the sandbox choice", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await auth.test!({ credential: { apiToken: "t", environment: "sandbox" } } as never, ctx);
  assertEquals(calls[0].url, `${SANDBOX}/contracts?limit=1`);
});

Deno.test("api-token: 401 and 403 are different problems and say so", async () => {
  const unauth = mockCtx([{ status: 401, body: { errors: [{ message: "Unauthorized call" }] } }]);
  const a = await auth.test!({ credential: { apiToken: "t" } } as never, unauth.ctx) as {
    ok: boolean;
    message: string;
  };
  assertEquals(a.ok, false);
  assert(a.message.includes("401"), a.message);

  const forbidden = mockCtx([{ status: 403, body: {} }]);
  const b = await auth.test!({ credential: { apiToken: "t" } } as never, forbidden.ctx) as {
    ok: boolean;
    message: string;
  };
  assert(b.message.includes("scope"), b.message);
});

Deno.test("api-token: a missing token fails before any network call", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await auth.test!({ credential: {} } as never, ctx), {
    ok: false,
    message: "credential missing apiToken",
  });
  assertEquals(calls.length, 0);
});

Deno.test("api-token: afterConnect records the environment, never the token", async () => {
  const d = await auth.afterConnect!(
    { credential: { apiToken: "sup3rsecret", environment: "sandbox" } } as never,
    null as never,
  ) as Record<string, unknown>;
  assertEquals(d, { environment: "sandbox" });
  assert(!JSON.stringify(d).includes("sup3rsecret"), "the credential leaked into display");
});
