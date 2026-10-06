import { assert, assertEquals } from "@std/assert";
import auth from "../../auth/token.ts";
import { mockCtx } from "../_helpers.ts";

const req = () => ({
  url: "https://api.fireberry.com/api/record/account",
  method: "GET",
  headers: {},
});

Deno.test("token: sign stamps the tokenid header and touches nothing else", () => {
  const request = req();
  const out = auth.sign!({ request, credential: { token: "T-123" } }, mockCtx().ctx);
  assertEquals((out as typeof request).headers, { tokenid: "T-123" });
  assertEquals((out as typeof request).url, request.url);
});

Deno.test("token: declares the tokenid header and a required secret field", () => {
  assertEquals(auth.type, "apiKey");
  assertEquals(auth.apiKey, { in: "header", name: "tokenid" });
  assertEquals(auth.fields![0].type, "secret");
  assertEquals(auth.fields![0].required, true);
});

Deno.test("token: test passes on an object list and sends the token as tokenid", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [{ name: "Account" }] } }]);
  assertEquals((await auth.test!({ credential: { token: "k" } }, ctx)).ok, true);
  assertEquals(new URL(calls[0].url).pathname, "/metadata/records");
  assertEquals(calls[0].headers.tokenid, "k");
});

Deno.test("token: test fails a 200 that is not an object list", async () => {
  const { ctx } = mockCtx([{ body: { hello: "world" } }]);
  const res = await auth.test!({ credential: { token: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("not an object list"));
});

Deno.test("token: test rejects a 401, with or without a body", async () => {
  const empty = mockCtx([{ status: 401 }]);
  const r1 = await auth.test!({ credential: { token: "k" } }, empty.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("401"));
  const json = mockCtx([{ status: 401, body: { error: "Unauthorized", status: 401 } }]);
  assertEquals((await auth.test!({ credential: { token: "k" } }, json.ctx)).ok, false);
});

Deno.test("token: a 403 is a recognised token the user may not read with — still working", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { Message: "forbidden" } }]);
  assertEquals((await auth.test!({ credential: { token: "k" } }, ctx)).ok, true);
});

Deno.test("token: 429, 5xx and non-JSON bodies are reported but not read as a good token", async () => {
  const rl = mockCtx([{ status: 429 }]);
  const r1 = await auth.test!({ credential: { token: "k" } }, rl.ctx);
  assertEquals(r1.ok, false);
  assert(r1.message!.includes("429"));
  const down = mockCtx([{ status: 500 }]);
  const r2 = await auth.test!({ credential: { token: "k" } }, down.ctx);
  assertEquals(r2.ok, false);
  assert(r2.message!.includes("erroring (500)"));
  const html = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await auth.test!({ credential: { token: "k" } }, html.ctx)).ok, false);
});

Deno.test("token: test fails without a token or when the host is unreachable", async () => {
  const none = await auth.test!({ credential: {} }, mockCtx().ctx);
  assertEquals(none.ok, false);
  const ctx = mockCtx().ctx; // empty queue makes the fake fetch throw
  const res = await auth.test!({ credential: { token: "k" } }, ctx);
  assertEquals(res.ok, false);
  assert(res.message!.includes("could not reach"));
});
