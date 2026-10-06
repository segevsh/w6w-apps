import { assert, assertEquals } from "@std/assert";
import apiToken from "../../auth/api-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { token: "SECRET-TOKEN" };

Deno.test("api-token: sign stamps a bearer header and keeps the rest of the request", async () => {
  const { ctx } = mockCtx();
  const out = await apiToken.sign!({
    request: { url: "https://api.rootly.com/v1/incidents", method: "GET", headers: { a: "b" } },
    credential: { token: " SECRET-TOKEN " },
  }, ctx);
  assertEquals(out.headers.authorization, "Bearer SECRET-TOKEN");
  assertEquals(out.headers.a, "b");
  assertEquals(out.url, "https://api.rootly.com/v1/incidents");
});

Deno.test("api-token: test passes on 2xx without returning the body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { id: "1", attributes: { email: "a@b.co" } } },
  }]);
  const res = await apiToken.test!({ credential: cred }, ctx);
  assertEquals(res, { ok: true });
  assertEquals(calls[0].url, "https://api.rootly.com/v1/users/me");
  assertEquals(calls[0].method, "GET");
});

Deno.test("api-token: a 403 still connects — the token authenticated, its role is limited", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { errors: [{ title: "Forbidden", status: "403" }] },
  }]);
  assertEquals(await apiToken.test!({ credential: cred }, ctx), { ok: true });
});

Deno.test("api-token: a 401 'Invalid token' is a rejection that never echoes the token", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { errors: [{ title: "Invalid token", status: "401" }] },
  }]);
  const res = await apiToken.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected"));
  assert(!res.message?.includes("SECRET-TOKEN"));
});

Deno.test("api-token: 429, an unexpected status, and a missing token are distinct failures", async () => {
  const rate = await apiToken.test!({ credential: cred }, mockCtx([{ status: 429 }]).ctx);
  assertEquals(rate.ok, false);
  assert(rate.message?.includes("429"));
  const odd = await apiToken.test!(
    { credential: cred },
    mockCtx([{ status: 502, body: "bad" }]).ctx,
  );
  assertEquals(odd.ok, false);
  assert(odd.message?.includes("502"));
  const { ctx, calls } = mockCtx();
  const none = await apiToken.test!({ credential: { token: "  " } }, ctx);
  assertEquals(none.ok, false);
  assertEquals(calls.length, 0);
});
