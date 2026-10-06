import { assert, assertEquals } from "@std/assert";
import authToken, { signBody } from "../../auth/auth-token.ts";
import { formOf, mockCtx } from "../_helpers.ts";

const cred = { authToken: "tok_123" };

Deno.test("signBody: merges auth_token into existing fields and overrides a forged one", () => {
  const out = new URLSearchParams(signBody("list_id=7&auth_token=evil", "tok"));
  assertEquals(Object.fromEntries(out), { list_id: "7", auth_token: "tok" });
  assertEquals(new URLSearchParams(signBody(null, "tok")).get("auth_token"), "tok");
});

Deno.test("sign: stamps auth_token on the form body and content-type", async () => {
  const req = await authToken.sign!({
    request: {
      url: "https://acumbamail.com/api/1/getLists/",
      method: "POST",
      headers: {},
      body: "list_id=7",
    },
    credential: cred,
  }, mockCtx().ctx);
  assertEquals(req.headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(String(req.body))), {
    list_id: "7",
    auth_token: "tok_123",
  });
  assert(!req.url.includes("tok_123"));
});

Deno.test("test: 200 is ok and sends the token in the form body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  assertEquals(await authToken.test({ credential: cred }, ctx), { ok: true });
  assertEquals(calls[0].url, "https://acumbamail.com/api/1/getLists/");
  assertEquals(formOf(calls[0]), { auth_token: "tok_123" });
});

Deno.test("test: 401 Unauthorized body is a rejection and never echoes the token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Unauthorized" }]);
  const r = await authToken.test({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("rejected"));
  assert(!r.message?.includes("tok_123"));
});

Deno.test("test: 429 and 500 are reported as themselves, not as a bad token", async () => {
  for (const status of [429, 500]) {
    const { ctx } = mockCtx([{ status, body: "slow down" }]);
    const r = await authToken.test({ credential: cred }, ctx);
    assertEquals(r.ok, false);
    assert(r.message?.includes(`HTTP ${status}`));
    assert(!r.message?.includes("rejected"));
  }
});

Deno.test("test: a 401 with a non-vendor body is not called a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>proxy login</html>" }]);
  const r = await authToken.test({ credential: cred }, ctx);
  assertEquals(r.ok, false);
  assert(r.message?.includes("HTTP 401"));
});

Deno.test("test: missing token fails without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await authToken.test({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});
