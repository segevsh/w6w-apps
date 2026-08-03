import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/access-token.ts";

const cred = { accessToken: "ll352u9jujauoqz4gstvsae05" };
const expected = `Bearer ${cred.accessToken}`;

Deno.test("access-token: declares one secret field and the bearer wire type", () => {
  assertEquals(auth.key, "access-token");
  assertEquals(auth.type, "bearer");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => f.key), ["accessToken"]);
  assertEquals(fields[0].type, "secret");
  assertEquals(fields[0].required, true);
});

Deno.test("access-token: sign stamps `Authorization: Bearer <token>` and returns the request", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred }, mockCtx().ctx);
  assertEquals(out.headers["authorization"], expected);
});

Deno.test("access-token: sign makes no network call", async () => {
  const { ctx, calls } = mockCtx();
  await auth.sign!(
    { request: { url: "https://x", method: "GET", headers: {} }, credential: cred },
    ctx,
  );
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test probes GET /users/me with the credential", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, email: "a@b.com" } }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, true);
  assertEquals(calls[0].url, "https://api.smartsheet.com/2.0/users/me");
  assertEquals(calls[0].headers["authorization"], expected);
});

Deno.test("access-token: test probes the whoami, not a resource listing", async () => {
  // `GET /sheets` would report a working token as broken for a user who owns
  // nothing, and `GET /users` would do so for anyone who is not a system admin.
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await auth.test({ credential: cred }, ctx);
  assert(calls[0].url.endsWith("/users/me"));
});

Deno.test("access-token: test fails without a network call when the token is missing", async () => {
  const { ctx, calls } = mockCtx();
  const result = await auth.test({ credential: {} }, ctx);
  assertEquals(result.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("access-token: test surfaces Smartsheet's own 1002 message on a bad token", async () => {
  // The live 401 body, verified against api.smartsheet.com on 2026-08-03.
  const { ctx } = mockCtx([{
    status: 401,
    body: { errorCode: 1002, message: "Your Access Token is invalid.", refId: "2j1nqp" },
  }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "Your Access Token is invalid.");
});

Deno.test("access-token: test surfaces the 1004 message an unauthorised call gets", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { errorCode: 1004, message: "You are not authorized to perform this action." },
  }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assertEquals(result.message, "You are not authorized to perform this action.");
});

Deno.test("access-token: test falls back to the status when the error body is not JSON", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "<html>oops</html>" }]);
  const result = await auth.test({ credential: cred }, ctx);
  assertEquals(result.ok, false);
  assert((result.message ?? "").includes("500"));
});

Deno.test("afterConnect: publishes user and account display data, never the token", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      id: 2977496047981956,
      email: "jane.doe@smartsheet.com",
      firstName: "Jane",
      lastName: "Doe",
      account: { id: 111, name: "Acme" },
    },
  }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].url, "https://api.smartsheet.com/2.0/users/me");
  assertEquals((display.user as Record<string, unknown>).email, "jane.doe@smartsheet.com");
  assertEquals((display.user as Record<string, unknown>).name, "Jane Doe");
  assertEquals((display.account as Record<string, unknown>).name, "Acme");
  // Nothing about the credential may reach the Connection's display data.
  assertEquals(JSON.stringify(display).includes(cred.accessToken), false);
});

Deno.test("afterConnect: stringifies ids so a 16-digit user id cannot round", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { id: 2977496047981956, account: { id: 7 } } }]);
  const display = await auth.afterConnect!({ credential: cred }, ctx) as Record<string, unknown>;
  assertEquals((display.user as Record<string, unknown>).id, "2977496047981956");
  assertEquals((display.account as Record<string, unknown>).id, "7");
});

Deno.test("afterConnect: degrades to empty display data rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: cred }, ctx), {});
});

Deno.test("access-token: documents that OAuth2 exists rather than half-shipping it", async () => {
  const src = await Deno.readTextFile(new URL("../../auth/access-token.ts", import.meta.url));
  assert(src.includes("https://app.smartsheet.com/b/authorize"));
  assert(src.includes("https://api.smartsheet.com/2.0/token"));
  // …but no oauth2 config is declared, because a half-wired one is worse than none.
  assertEquals(auth.oauth2, undefined);
});
