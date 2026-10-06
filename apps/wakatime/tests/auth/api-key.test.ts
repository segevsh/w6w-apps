import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/api-key.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { apiKey: "waka_SECRET" };
// deno-lint-ignore no-explicit-any
const test = (c: any, ctx: any) => auth.test!({ credential: c } as any, ctx);
const basic = `Basic ${btoa("waka_SECRET")}`;

Deno.test("sign: sets HTTP Basic with the trimmed base64 key, no colon", async () => {
  const req = await auth.sign!({
    request: { url: "u", method: "GET", headers: {} },
    credential: { apiKey: "  waka_SECRET \n" },
    // deno-lint-ignore no-explicit-any
  } as any, {} as any);
  assertEquals((req as { headers: Record<string, string> }).headers.authorization, basic);
  assertEquals(atob(basic.slice(6)), "waka_SECRET");
});

Deno.test("test: a 2xx with a user id is ok; key only in the header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "u1", username: "ann" } } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.wakatime.com/api/v1/users/current");
  assertEquals(calls[0].headers.authorization, basic);
  assert(!calls[0].url.includes("waka_SECRET"));
});

Deno.test("test: a 2xx without a user id is not ok", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  assertEquals((await test(cred, ctx)).ok, false);
});

Deno.test("test: 401 Unauthorized is a rejection that never echoes the key", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { errors: ["Unauthorized."] } }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("rejected the API key"));
  assert(!r.message!.includes("waka_SECRET"));
});

Deno.test("test: 429, 5xx and other statuses are distinguished", async () => {
  assert(
    (await test(cred, mockCtx([{ status: 429, body: {} }]).ctx)).message!.includes("rate-limited"),
  );
  assert(
    (await test(cred, mockCtx([{ status: 503, body: {} }]).ctx)).message!.includes("erroring"),
  );
  const r = await test(cred, mockCtx([{ status: 400, body: { errors: ["bad"] } }]).ctx);
  assert(r.message!.includes("HTTP 400"));
});

Deno.test("test: a missing key fails without a request; a network error is reported", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({}, ctx)).ok, false);
  assertEquals(calls.length, 0);
  // deno-lint-ignore no-explicit-any
  const boom = { fetch: () => Promise.reject(new Error("dns")) } as any;
  assert((await test(cred, boom)).message!.includes("could not reach"));
});

Deno.test("afterConnect: labels the connection with the username, falls back on failure", async () => {
  // deno-lint-ignore no-explicit-any
  const after = (ctx: any) => auth.afterConnect!({ credential: cred } as any, ctx);
  assertEquals(await after(mockCtx([{ body: { data: { username: "ann" } } }]).ctx), {
    user: "ann",
  });
  assertEquals(await after(mockCtx([{ status: 401, body: {} }]).ctx), { user: "WakaTime" });
});
