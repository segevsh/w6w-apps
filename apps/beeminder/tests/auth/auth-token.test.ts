import { assert, assertEquals } from "@std/assert";
import authToken from "../../auth/auth-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { authToken: "SECRET-TOKEN" };
const BAD = { errors: { auth_token: "bad_token", message: "No such auth_token found." } };

Deno.test("auth-token: sign adds auth_token (trimmed) to the query and keeps existing params", async () => {
  const { ctx } = mockCtx();
  const out = await authToken.sign!({
    request: {
      url: "https://www.beeminder.com/api/v1/users/me/goals.json?emaciated=true",
      method: "GET",
      headers: {},
    },
    credential: { authToken: " SECRET-TOKEN " },
  }, ctx);
  const u = new URL(out.url);
  assertEquals(u.searchParams.get("auth_token"), "SECRET-TOKEN");
  assertEquals(u.searchParams.get("emaciated"), "true");
  assertEquals(u.pathname, "/api/v1/users/me/goals.json");
  assertEquals(out.headers.authorization, undefined);
});

Deno.test("auth-token: test passes on 200 via GET /users/me.json with the token in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { username: "alice", timezone: "UTC", goals: [] } }]);
  assertEquals(await authToken.test!({ credential: cred }, ctx), { ok: true });
  assertEquals(
    calls[0].url,
    "https://www.beeminder.com/api/v1/users/me.json?auth_token=SECRET-TOKEN",
  );
});

Deno.test("auth-token: 401 is a rejection that never echoes the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: BAD }]);
  const res = await authToken.test!({ credential: cred }, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected"));
  assert(!res.message?.includes("SECRET-TOKEN"));
});

Deno.test("auth-token: a 200 carrying errors is not a pass; 5xx and a missing token differ", async () => {
  const odd = mockCtx([{ status: 200, body: BAD }]);
  assertEquals((await authToken.test!({ credential: cred }, odd.ctx)).ok, false);
  const down = mockCtx([{ status: 503, body: "maintenance" }]);
  assert((await authToken.test!({ credential: cred }, down.ctx)).message?.includes("HTTP 503"));
  const none = mockCtx();
  assertEquals((await authToken.test!({ credential: { authToken: " " } }, none.ctx)).ok, false);
  assertEquals(none.calls.length, 0);
});
