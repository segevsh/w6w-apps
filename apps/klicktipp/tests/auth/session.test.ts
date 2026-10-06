import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/session.ts";

const cred = { username: "main-api", password: "pw", sessid: "xyz123", sessionName: "SSESSabc" };
const request = () => ({
  url: "https://api.klicktipp.com/tag",
  method: "GET",
  headers: {} as Record<string, string>,
});

Deno.test("session: sign stamps the cookie as <session_name>=<sessid>, and nothing else", async () => {
  const { ctx } = mockCtx();
  const out = await auth.sign!({ request: request(), credential: cred }, ctx);
  assertEquals(out.headers, { cookie: "SSESSabc=xyz123" });
  assert(!JSON.stringify(out).includes("pw"), "the password must never be stamped");
});

Deno.test("session: exchange logs in and stores both the session and the login", async () => {
  const { ctx, calls } = mockCtx([{
    body: { sessid: "s1", session_name: "SSESSn", account: { uid: 7 } },
  }]);
  const out = await auth.exchange!({ fields: { username: " u ", password: "p" } }, ctx);
  assertEquals(out, { username: "u", password: "p", sessid: "s1", sessionName: "SSESSn", uid: 7 });
  assertEquals(calls[0].url, "https://api.klicktipp.com/account/login");
  assertEquals(JSON.parse(calls[0].body!), { username: "u", password: "p" });
});

Deno.test("session: exchange rejects missing fields and a refused login", async () => {
  const a = mockCtx();
  await assertRejects(
    async () => await auth.exchange!({ fields: { username: "u" } }, a.ctx),
    Error,
    "both required",
  );
  const b = mockCtx([{ status: 401, body: ["Wrong username or password."] }]);
  await assertRejects(
    async () => await auth.exchange!({ fields: { username: "u", password: "bad" } }, b.ctx),
    Error,
    "Wrong username or password.",
  );
});

Deno.test("session: refresh logs in again with the stored login and keeps the rest", async () => {
  const { ctx, calls } = mockCtx([{ body: { sessid: "s2", session_name: "SSESSn2" } }]);
  const out = await auth.refresh!({ credential: cred }, ctx) as typeof cred;
  assertEquals(out.sessid, "s2");
  assertEquals(out.sessionName, "SSESSn2");
  assertEquals(out.username, "main-api");
  assertEquals(JSON.parse(calls[0].body!), { username: "main-api", password: "pw" });
});

Deno.test("session: refresh without stored login asks to reconnect", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => await auth.refresh!({ credential: { sessid: "x" } }, ctx),
    Error,
    "reconnect",
  );
});

Deno.test("session: test passes on a JSON object from GET /field", async () => {
  const { ctx, calls } = mockCtx([{ body: { fieldFirstName: "First name" } }]);
  assertEquals(await auth.test({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://api.klicktipp.com/field");
  assertEquals(calls[0].headers.cookie, "SSESSabc=xyz123");
});

Deno.test("session: test fails on 403 'API access denied', naming both causes", async () => {
  const { ctx } = mockCtx([{ status: 403, body: ["API access denied."] }]);
  const r = await auth.test({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("expired") && r.message!.includes("Premium"), r.message);
});

Deno.test("session: a 200 that is not an object is not a live session", async () => {
  const { ctx } = mockCtx([{ body: "<html>login</html>" }]);
  assertEquals((await auth.test({ credential: cred }, ctx)).ok, false);
});

Deno.test("session: test without a session fails without calling out", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("session: afterConnect records only the username", async () => {
  const { ctx } = mockCtx();
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), { username: "main-api" });
});

Deno.test("session: revoke POSTs /account/logout with the cookie, and swallows a failure", async () => {
  const ok = mockCtx([{ body: [true] }]);
  await auth.revoke!({ credential: cred }, ok.ctx);
  assertEquals(ok.calls[0].url, "https://api.klicktipp.com/account/logout");
  assertEquals(ok.calls[0].method, "POST");
  assertEquals(ok.calls[0].headers.cookie, "SSESSabc=xyz123");
  const down = mockCtx([]); // mock throws on an unqueued fetch
  await auth.revoke!({ credential: cred }, down.ctx);
  assertEquals(down.logs.length, 1);
});

Deno.test("session: username is required, the password is the only secret", () => {
  assertEquals(auth.fields!.filter((f) => f.required).map((f) => f.key), ["username", "password"]);
  assertEquals(auth.fields!.filter((f) => f.type === "secret").map((f) => f.key), ["password"]);
});
