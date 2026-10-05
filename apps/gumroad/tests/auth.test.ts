import { assertEquals } from "@std/assert";
import accessToken, { authHeaders } from "../auth/access-token.ts";
import { mockCtx, pathOf } from "./_helpers.ts";

// deno-lint-ignore no-explicit-any
const run = (hook: any, credential: unknown, ctx: unknown) => hook({ credential }, ctx);

Deno.test("auth: declares a bearer method with a secret accessToken field", () => {
  assertEquals(accessToken.type, "bearer");
  assertEquals(accessToken.fields?.[0].key, "accessToken");
  assertEquals(accessToken.fields?.[0].type, "secret");
});

Deno.test("auth: sign stamps the bearer header and never touches the URL", () => {
  // deno-lint-ignore no-explicit-any
  const sign = accessToken.sign as any;
  const request = { url: "https://api.gumroad.com/v2/products", method: "GET", headers: {} };
  const out = sign({ request, credential: { accessToken: "tok_123" } });
  assertEquals(out.headers.authorization, "Bearer tok_123");
  assertEquals(out.url, "https://api.gumroad.com/v2/products");
});

Deno.test("auth: authHeaders tolerates a missing token", () => {
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

Deno.test("auth: test passes on success:true from /v2/user", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, user: { name: "A", user_id: "u1" } } }]);
  assertEquals(await run(accessToken.test, { accessToken: "t" }, ctx), { ok: true });
  assertEquals(pathOf(calls[0].url), "/v2/user");
  assertEquals(calls[0].headers.authorization, "Bearer t");
});

Deno.test("auth: test fails on an empty credential without calling the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await run(accessToken.test, { accessToken: "  " }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: test classifies from the body — a 200 with success:false is a rejection", async () => {
  const { ctx } = mockCtx([{ body: { success: false, message: "bad token" } }]);
  const out = await run(accessToken.test, { accessToken: "t" }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message.includes("bad token"), true);
});

Deno.test("auth: test reports the vendor message on a 401", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { success: false, message: "Unauthorized" } }]);
  const out = await run(accessToken.test, { accessToken: "t" }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message.includes("Unauthorized"), true);
});

Deno.test("auth: test handles a non-JSON 401 and an unexpected 500", async () => {
  const a = mockCtx([{ status: 401, body: "nope" }]);
  assertEquals((await run(accessToken.test, { accessToken: "t" }, a.ctx)).ok, false);
  const b = mockCtx([{ status: 500, body: "boom" }]);
  const out = await run(accessToken.test, { accessToken: "t" }, b.ctx);
  assertEquals(out.message.includes("500"), true);
});

Deno.test("auth: afterConnect publishes name and userId only — never the email", async () => {
  const { ctx } = mockCtx([{
    body: { success: true, user: { name: "A", user_id: "u1", email: "a@b.co", bio: "x" } },
  }]);
  const out = await run(accessToken.afterConnect, { accessToken: "t" }, ctx);
  assertEquals(out, { name: "A", userId: "u1" });
});

Deno.test("auth: afterConnect is silent on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { success: false } }]);
  assertEquals(await run(accessToken.afterConnect, { accessToken: "t" }, ctx), {});
  const b = mockCtx([{ body: { success: true, user: {} } }]);
  assertEquals(await run(accessToken.afterConnect, { accessToken: "t" }, b.ctx), {});
});
