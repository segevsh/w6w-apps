import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import oauth2, { authHeaders, classifyAuthFailure } from "../../auth/oauth2.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

test("oauth2.sign: stamps the bearer header and returns the request", () => {
  const request = {
    url: "https://api.tumblr.com/v2/user/info",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = oauth2.sign!({ request, credential: { accessToken: "tok123" } } as never, {
    fetch: () => {
      throw new Error("sign must not call fetch");
    },
    log: () => {},
  } as never);
  assertEquals((out as typeof request).headers["authorization"], "Bearer tok123");
});

test("oauth2.test: ok when GET /v2/user/info succeeds", async () => {
  const { ctx, calls } = mockCtx([{ body: { meta: { status: 200, msg: "OK" }, response: {} } }]);
  const out = await oauth2.test({ credential: { accessToken: "tok" } }, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/user/info");
  assertEquals(calls[0].headers["authorization"], "Bearer tok");
  assertEquals(out, { ok: true });
});

test("oauth2.test: missing accessToken fails without a network call", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await oauth2.test({ credential: {} }, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

test("oauth2.test: classifies code 1013 as an invalid/expired token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody(1013, "Unable to authorize") }]);
  const out = await oauth2.test({ credential: { accessToken: "bad" } }, ctx);
  assertEquals(out.ok, false);
  assertEquals(out.message?.includes("1013"), true, out.message);
});

// The regression this guards: classifying by `errors[0].detail`'s wording
// instead of `code` would misclassify EVERY code:0 failure differently,
// since Tumblr randomises that string — verified live on 2026-09-05 (three
// different sentences for the same unauthenticated call).
test("classifyAuthFailure: branches on code, ignoring detail's randomised wording", () => {
  const a = classifyAuthFailure(401, { errors: [{ code: 0, detail: "Hit a glitch. Try again." }] });
  const b = classifyAuthFailure(401, {
    errors: [{ code: 0, detail: "Internet strangeness. Try again." }],
  });
  assertEquals(a, b);
});

test("classifyAuthFailure: code 1013 is always the invalid-token message, regardless of detail", () => {
  const msg = classifyAuthFailure(401, { errors: [{ code: 1013, detail: "Unable to authorize" }] });
  assertEquals(msg.includes("1013"), true, msg);
  assertEquals(msg.includes("reconnect"), true, msg);
});

test("authHeaders: builds the bearer header, empty string when credential is missing", () => {
  assertEquals(authHeaders({ accessToken: "abc" }), { authorization: "Bearer abc" });
  assertEquals(authHeaders({}), { authorization: "Bearer " });
});

test("oauth2.afterConnect: publishes only the account's name", async () => {
  const { ctx } = mockCtx([
    {
      body: {
        meta: { status: 200, msg: "OK" },
        response: { user: { name: "derekg", email: "x@y.com" } },
      },
    },
  ]);
  const out = await oauth2.afterConnect!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(out, { name: "derekg" });
});

test("oauth2.afterConnect: silent on failure — never throws", async () => {
  const { ctx } = mockCtx([{ status: 500, body: { meta: { status: 500, msg: "Error" } } }]);
  const out = await oauth2.afterConnect!({ credential: { accessToken: "tok" } } as never, ctx);
  assertEquals(out, {});
});

test("oauth2: setup guidance names Tumblr's consumer key", () => {
  assert(/consumer key/i.test(oauth2.oauth2?.setup?.clientIdHint ?? ""));
});
