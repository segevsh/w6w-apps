import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/access-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { accessToken: "breezy_pat_SECRET" };
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);

Deno.test("sign: sets the bare token as the authorization header, trimmed", async () => {
  const req = await auth.sign!({
    request: { url: "u", method: "GET", headers: {} },
    credential: { accessToken: "  breezy_pat_SECRET \n" },
    // deno-lint-ignore no-explicit-any
  } as any, {} as any);
  assertEquals(
    (req as { headers: Record<string, string> }).headers.authorization,
    "breezy_pat_SECRET",
  );
});

Deno.test("test: a 2xx with a user _id is ok; token only in the header", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "u1", name: "Ann" } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/user");
  assertEquals(calls[0].headers.authorization, "breezy_pat_SECRET");
});

Deno.test("test: a 2xx without a user _id is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred, ctx)).ok, false);
});

Deno.test("test: HTTP 400 invalidAccessToken (not 401) is a rejected token, secret not echoed", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { type: "invalidAccessToken", message: "access token is invalid" } },
  }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("invalidAccessToken"));
  assert(!r.message!.includes("SECRET"));
});

Deno.test("test: classified by body type, so a 401 with another type is not 'rejected token'", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: { type: "other", message: "x" } } }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("HTTP 401 (other: x)"));
});

Deno.test("test: 429, 5xx, a network failure and a missing token all fail with a reason", async () => {
  assert((await test(cred, mockCtx([{ status: 429, body: {} }]).ctx)).message!.includes("429"));
  assert(
    (await test(cred, mockCtx([{ status: 503, body: "x" }]).ctx)).message!.includes("erroring"),
  );
  assert((await test(cred, mockCtx([]).ctx)).message!.includes("could not reach"));
  assertEquals((await test({}, mockCtx([]).ctx)).message, "credential missing the access token");
});

Deno.test("afterConnect: records the user's name, falling back to Breezy HR", async () => {
  const ok = mockCtx([{ body: { _id: "u1", name: "Ann" } }]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({ credential: cred } as any, ok.ctx), { user: "Ann" });
  const bad = mockCtx([{ status: 400, body: { error: { type: "invalidAccessToken" } } }]);
  // deno-lint-ignore no-explicit-any
  assertEquals(await auth.afterConnect!({ credential: cred } as any, bad.ctx), {
    user: "Breezy HR",
  });
});
