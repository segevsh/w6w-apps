import { assert, assertEquals } from "@std/assert";
import type { HookContext } from "@w6w/types";
import auth, { authHeaders } from "../../auth/personal-access-token.ts";
import { mockCtx } from "../_helpers.ts";

const cred = { workspace: "acme", userId: "rbAXPnMktTFbNpwtJ", authToken: "tok-secret" };
// deno-lint-ignore no-explicit-any
const test = (c: unknown, ctx: HookContext) => (auth.test as any)({ credential: c }, ctx);

Deno.test("auth: a custom method with a workspace, a user id and a secret token", () => {
  assertEquals(auth.key, "personal-access-token");
  assertEquals(auth.type, "custom");
  assertEquals(auth.fields?.map((f) => [f.key, f.type, f.required]), [
    ["workspace", "string", true],
    ["userId", "string", true],
    ["authToken", "secret", true],
  ]);
});

Deno.test("auth.sign: stamps X-Auth-Token and X-User-Id and keeps other headers", () => {
  const out = auth.sign!({
    request: { url: `https://acme.rocket.chat/api/v1/me`, method: "GET", headers: { a: "b" } },
    credential: { ...cred, authToken: "  tok  " },
  } as never, mockCtx().ctx) as { headers: Record<string, string> };
  assertEquals(out.headers, { a: "b", "x-auth-token": "tok", "x-user-id": cred.userId });
  assertEquals(authHeaders({}), { "x-auth-token": "", "x-user-id": "" });
});

Deno.test("auth.test: a 200 profile with an _id passes; credentials ride in headers, never the URL", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: cred.userId, username: "bot", success: true } }]);
  assertEquals(await test(cred, ctx), { ok: true });
  assertEquals(calls[0].url, "https://acme.rocket.chat/api/v1/me");
  assertEquals(calls[0].headers["x-auth-token"], "tok-secret");
  assertEquals(calls[0].headers["x-user-id"], cred.userId);
  assert(!calls[0].url.includes("tok-secret"));
});

Deno.test("auth.test: a 200 without an _id is NOT a pass (a 200 is not proof)", async () => {
  const { ctx } = mockCtx([{
    body: "<html>login</html>",
    headers: { "content-type": "text/html" },
  }]);
  assertEquals((await test(cred, ctx)).ok, false);
});

Deno.test("auth.test: 401 quotes the vendor message", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { success: false, status: "error", message: "You must be logged in to do this." },
  }]);
  const r = await test(cred, ctx);
  assertEquals(r.ok, false);
  assert(r.message.includes("You must be logged in to do this."), r.message);
});

Deno.test("auth.test: 404 names the workspace; a missing field or bad workspace makes no call", async () => {
  const nf = mockCtx([{ status: 404, body: "nope" }]);
  const r = await test(cred, nf.ctx);
  assert(!r.ok && r.message.includes("acme.rocket.chat"), r.message);
  const { ctx, calls } = mockCtx([]);
  assertEquals((await test({ ...cred, userId: "" }, ctx)).ok, false);
  assertEquals((await test({ ...cred, workspace: "chat.example.com" }, ctx)).ok, false);
  assertEquals((await test(undefined, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth.afterConnect: publishes the workspace and username, degrades on failure", async () => {
  const after = (c: unknown, ctx: HookContext) =>
    // deno-lint-ignore no-explicit-any
    (auth.afterConnect as any)({ credential: c }, ctx);
  const ok = mockCtx([{ body: { _id: "u", username: "bot", name: "Bot" } }]);
  assertEquals(await after({ ...cred, workspace: "https://ACME.rocket.chat/" }, ok.ctx), {
    workspace: "acme",
    username: "bot",
    name: "Bot",
  });
  const bad = mockCtx([{ status: 401, body: {} }]);
  assertEquals(await after(cred, bad.ctx), { workspace: "acme", username: cred.userId });
});
