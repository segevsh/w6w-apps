import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-user.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-user: fetches one user", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", user: { user_id: 7 } } }]);
  const out = await action.execute!({ user_id: 7 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/7");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { client_gravatar: "false" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { user: { user_id: 7 } });
});

Deno.test("get-user: custom profile fields are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", user: { user_id: 7 } } }]);
  const out = await action.execute!({ user_id: 7, include_custom_profile_fields: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/7");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    client_gravatar: "false",
    include_custom_profile_fields: "true",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { user: { user_id: 7 } });
});

Deno.test("get-user: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", user: { user_id: 7 } } }]);
  await action.execute!({ user_id: 7 }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-user: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ user_id: 7 }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("get-user: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ user_id: 7 }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-user: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ user_id: 7 }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
