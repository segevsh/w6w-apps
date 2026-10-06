import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import bearerToken from "../auth/bearer-token.ts";
import { API_ROOT, errorBody, mockCtx, pathOf } from "./_helpers.ts";

type Result = { ok: boolean; message?: string };
const run = (cred: unknown, ctx: HookContext) =>
  (bearerToken.test as unknown as (a: { credential: unknown }, c: HookContext) => Promise<Result>)(
    { credential: cred },
    ctx,
  );

Deno.test("auth.sign: stamps Authorization: Bearer", () => {
  const out = (bearerToken.sign as unknown as (a: unknown) => { headers: Record<string, string> })({
    request: { url: `${API_ROOT}/templates`, method: "GET", headers: {} },
    credential: { apiToken: "tok_123" },
  });
  assertEquals(out.headers.authorization, "Bearer tok_123");
});

Deno.test("auth.test: a {data: []} envelope is a pass, and the probe is signed", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], links: {}, meta: {} } }]);
  assertEquals(await run({ apiToken: "tok_123" }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/templates");
  assertEquals(calls[0].headers.authorization, "Bearer tok_123");
});

Deno.test("auth.test: the Unauthenticated body fails, whatever the status", async () => {
  for (const status of [401, 200]) {
    const { ctx } = mockCtx([{ status, body: errorBody("Unauthenticated.") }]);
    const r = await run({ apiToken: "nope" }, ctx);
    assertEquals(r.ok, false);
    assert(/rejected/.test(r.message ?? ""));
  }
});

Deno.test("auth.test: a 200 without a data array does not pass", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await run({ apiToken: "x" }, ctx)).ok, false);
});

Deno.test("auth.test: non-JSON body and missing token fail without echoing the token", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const r = await run({ apiToken: "secret_tok" }, ctx);
  assertEquals(r.ok, false);
  assert(!(r.message ?? "").includes("secret_tok"));
  const { ctx: c2, calls } = mockCtx([]);
  assertEquals((await run({}, c2)).ok, false);
  assertEquals(calls.length, 0);
});
