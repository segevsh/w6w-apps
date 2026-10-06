import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = (extra: Record<string, unknown> = {}) => ({
  apiKey: "SECRET",
  region: "eu",
  ...extra,
});
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);

Deno.test("sign: sets the bare key (no Bearer prefix) in authorization", async () => {
  // deno-lint-ignore no-explicit-any
  const req = await auth.sign!({ request: { headers: {} }, credential: cred() } as any, {} as any);
  assertEquals((req as { headers: Record<string, string> }).headers.authorization, "SECRET");
});

Deno.test("test: a 2xx with a numeric team_id is ok; the key is only in the header", async () => {
  const { ctx, calls } = mockCtx([{ body: { team_id: 1, name: "Acme" } }]);
  assertEquals(await test(cred(), ctx), { ok: true });
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/teams");
  assertEquals(calls[0].headers.authorization, "SECRET");
});

Deno.test("test: a 2xx without team_id is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred(), ctx)).ok, false);
});

Deno.test("test: the US region hits the US host", async () => {
  const { ctx, calls } = mockCtx([{ body: { team_id: 1 } }]);
  await test(cred({ region: "us" }), ctx);
  assertEquals(calls[0].url, "https://public-api-us.ringover.com/v2/teams");
});

Deno.test("test: a rejected key surfaces Ringover's error text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "Invalid user" } }]);
  const r = await test(cred(), ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("Invalid user"));
  assert(r.message!.includes("Region"));
});

Deno.test("test: a non-error body (HTML shell) is not ok and says so", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html></html>" }]);
  assertEquals((await test(cred(), ctx)).ok, false);
  const bad = mockCtx([{ status: 403, body: "<html>blocked</html>" }]);
  assert((await test(cred(), bad.ctx)).message!.includes("non-error body"));
});

Deno.test("test: 5xx is reported as Ringover erroring; unreachable and missing key fail", async () => {
  const e = mockCtx([{ status: 503, body: { error: "down" } }]);
  assert((await test(cred(), e.ctx)).message!.includes("erroring"));
  assertEquals((await test(cred(), mockCtx([]).ctx)).ok, false);
  assertEquals((await test({}, mockCtx([]).ctx)).ok, false);
});

Deno.test("afterConnect: records region and the team name, falls back on failure", async () => {
  const { ctx } = mockCtx([{ body: { team_id: 1, name: "Acme" } }]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({ credential: cred({ region: "us" }) } as any, ctx), {
    region: "us",
    team: "Acme",
  });
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({ credential: cred() } as any, mockCtx([]).ctx), {
    region: "eu",
    team: "Ringover",
  });
});
