import { assert, assertEquals } from "@std/assert";
import auth, { basicHeader } from "../auth/basic.ts";
import { envelope, errorBody, mockCtx, pathOf } from "./_helpers.ts";

const cred = { userId: "5aba36b19007ba0f570c9523", apiKey: "k3y" };
const expected = `Basic ${btoa("5aba36b19007ba0f570c9523:k3y")}`;

Deno.test("basic: user id is the Basic username, api key the password", () => {
  assertEquals(basicHeader(cred.userId, cred.apiKey), expected);
  assertEquals(atob(basicHeader("u", "p").slice(6)), "u:p");
});

Deno.test("basic: declares type basic with a plain userId and a secret apiKey", () => {
  assertEquals(auth.key, "basic");
  assertEquals(auth.type, "basic");
  const fields = auth.fields ?? [];
  assertEquals(fields.map((f) => [f.key, f.type]), [["userId", "string"], ["apiKey", "secret"]]);
  assert(fields.every((f) => f.required));
});

Deno.test("basic: sign stamps the Authorization header and returns the request", async () => {
  const request = {
    url: "https://x",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential: cred } as never, {} as never);
  assertEquals((out as typeof request).headers["authorization"], expected);
});

Deno.test("basic: test passes only on the documented /users array shape", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ user: { id: cred.userId } }]) }]);
  const r = await auth.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/v3/users");
  assertEquals(calls[0].headers["authorization"], expected);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("basic: HTTP 401 with body status 400 / invalid_login is a rejection (body decides)", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_login", "Invalid login data provided"),
  }]);
  const r = await auth.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("invalid_login"));
});

Deno.test("basic: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>shell</html>" }]);
  assertEquals((await auth.test({ credential: cred } as never, ctx)).ok, false);
  const m = mockCtx([{ status: 200, body: { data: {} } }]);
  assertEquals((await auth.test({ credential: cred } as never, m.ctx)).ok, false);
});

Deno.test("basic: a non-auth vendor error is reported with its error_name, not as bad creds", async () => {
  const { ctx } = mockCtx([{
    status: 402,
    body: errorBody("subscription_canceled", "lapsed", 402),
  }]);
  const r = await auth.test({ credential: cred } as never, ctx);
  assertEquals(r.ok, false);
  assert(r.message!.includes("subscription_canceled") && !r.message!.includes("rejected"));
});

Deno.test("basic: test refuses an incomplete credential without any request", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals((await auth.test({ credential: { userId: "u" } } as never, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("basic: afterConnect labels from the record matching the user id, never the key", async () => {
  const { ctx } = mockCtx([{
    body: envelope([
      { user: { id: "other", first_name: "X", last_name: "Y", email: "x@y.com" } },
      { user: { id: cred.userId, first_name: "Ada", last_name: "Lovelace", email: "ada@x.com" } },
    ]),
  }]);
  const out = await auth.afterConnect!({ credential: cred } as never, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.user, { id: cred.userId, email: "ada@x.com", name: "Ada Lovelace" });
  assertEquals(JSON.stringify(out).includes("k3y"), false);
});

Deno.test("basic: afterConnect returns {} on failure", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("invalid_login", "x") }]);
  assertEquals(await auth.afterConnect!({ credential: cred } as never, ctx), {});
});
