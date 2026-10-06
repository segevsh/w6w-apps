import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/personal-access-token.ts";
import { mockCtx } from "../_helpers.ts";

const TOKEN = "pat-secret-123";
const cred = { accessToken: TOKEN };

Deno.test("auth: bearer definition with one secret field", () => {
  assertEquals(auth.key, "personal-access-token");
  assertEquals(auth.type, "bearer");
  assertEquals(auth.fields?.length, 1);
  assertEquals(auth.fields?.[0].type, "secret");
});

Deno.test("auth.sign: stamps the Bearer header", async () => {
  const request = {
    url: "https://public.api.hospitable.com/v2/user",
    headers: {} as Record<string, string>,
  };
  // deno-lint-ignore no-explicit-any
  const out = await (auth.sign as any)({ request, credential: cred });
  assertEquals(out.headers.authorization, `Bearer ${TOKEN}`);
});

Deno.test("auth.test: the user document passes; the token is sent only as a header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "u1", name: "Ann" } } }]);
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, "https://public.api.hospitable.com/v2/user");
  assertEquals(calls[0].headers.authorization, `Bearer ${TOKEN}`);
  assertEquals(calls[0].url.includes(TOKEN), false);
});

Deno.test("auth.test: a 200 without a user document is not a pass", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
});

Deno.test("auth.test: a 401 is a rejection, and the message never echoes the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const res = await auth.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected"), res.message);
  assertEquals(res.message?.includes(TOKEN), false);
});

Deno.test("auth.test: 403, 5xx and a missing token each fail with a distinct message", async () => {
  const forbidden = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  const r1 = await auth.test!({ credential: cred }, forbidden.ctx);
  assert(r1.message?.includes("403"));
  const boom = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const r2 = await auth.test!({ credential: cred }, boom.ctx);
  assert(r2.message?.includes("502"));
  const none = mockCtx([]);
  const r3 = await auth.test!({ credential: {} }, none.ctx);
  assertEquals(r3.ok, false);
  assertEquals(none.calls.length, 0);
});

Deno.test("auth.afterConnect: labels the connection with the name, then the email, else nothing", async () => {
  const named = mockCtx([{ body: { data: { name: "Ann", email: "a@x.com" } } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, named.ctx), { account: "Ann" });
  const mailed = mockCtx([{ body: { data: { email: "a@x.com" } } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, mailed.ctx), { account: "a@x.com" });
  const failed = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, failed.ctx), {});
  const thrown = mockCtx([]);
  assertEquals(await auth.afterConnect!({ credential: cred }, thrown.ctx), {});
});
