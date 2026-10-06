import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-users.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-users: lists users, asking for real avatar URLs", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", members: [{ user_id: 1 }] },
  }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { client_gravatar: "false" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { members: [{ user_id: 1 }] });
});

Deno.test("get-users: user_ids and custom fields are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", members: [] } }]);
  const out = await action.execute!({ user_ids: "1,2", include_custom_profile_fields: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    client_gravatar: "false",
    include_custom_profile_fields: "true",
    user_ids: "[1,2]",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { members: [] });
});

Deno.test("get-users: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", members: [{ user_id: 1 }] },
  }]);
  await action.execute!({}, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-users: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("get-users: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-users: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
