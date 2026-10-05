import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import accessToken, { authHeaders, PROBE_PATH } from "../../auth/access-token.ts";
import { API_ROOT, mockCtx, unauthorized } from "../_helpers.ts";

type Test = NonNullable<typeof accessToken.test>;
const run = (ctx: HookContext, token = "pat-123") =>
  (accessToken.test as Test)({ credential: { token } } as never, ctx);

Deno.test("auth: is a bearer method with one secret field", () => {
  assertEquals(accessToken.type, "bearer");
  assertEquals(accessToken.fields?.map((f) => [f.key, f.type]), [["token", "secret"]]);
});

Deno.test("auth: sign stamps Authorization: Bearer and nothing else", () => {
  const request = { url: "https://api.salesmessage.com/pub/v2.3/user", method: "GET", headers: {} };
  const { ctx } = mockCtx([]);
  const signed = accessToken.sign!({ request, credential: { token: "pat-123" } } as never, ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers, { authorization: "Bearer pat-123" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("auth: a JSON profile body is a live credential", async () => {
  const { ctx, calls } = mockCtx([{ body: { email: "a@b.co", firstName: "A" } }]);
  assertEquals(await run(ctx), { ok: true });
  assertEquals(calls[0].url, `${API_ROOT}${PROBE_PATH}`);
  assertEquals(calls[0].headers.authorization, "Bearer pat-123");
});

Deno.test("auth: the probe path is not an endpoint that echoes the token", () => {
  assertEquals(PROBE_PATH, "/user");
});

Deno.test("auth: a 401 Unauthorized body is a rejected token", async () => {
  const { ctx } = mockCtx([unauthorized(401)]);
  const result = await run(ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("rejected"), result.message);
});

Deno.test("auth: the 403 'could not decode token' body is classified from its wording", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { message: "Could not decode token: Error while decoding from JSON", status: 403 },
  }]);
  const result = await run(ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("rejected the token"), result.message);
});

Deno.test("auth: a 403 with an unrelated body is a scope problem, not a bad token", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "This action is forbidden" } }]);
  const result = await run(ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("users:read"), result.message);
});

Deno.test("auth: a 500 with an empty message is neither valid nor 'rejected'", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { message: null } }]);
  const result = await run(ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("HTTP 500"), result.message);
});

Deno.test("auth: a 200 that is not a JSON object does not prove the token", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  const result = await run(ctx);
  assertEquals(result.ok, false);
});

Deno.test("auth: a network failure is not a statement about the credential", async () => {
  const ctx = {
    fetch: () => Promise.reject(new Error("boom")),
    log: () => {},
  } as unknown as HookContext;
  const result = await run(ctx);
  assertEquals(result.ok, false);
  assert(result.message?.includes("not a statement about the credential"), result.message);
});

Deno.test("auth: an empty token is refused without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const result = await run(ctx, "  ");
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});
