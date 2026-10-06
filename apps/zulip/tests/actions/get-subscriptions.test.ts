import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-subscriptions.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-subscriptions: lists subscriptions with no query by default", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", subscriptions: [{ name: "general" }] },
  }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/me/subscriptions");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { subscriptions: [{ name: "general" }] });
});

Deno.test("get-subscriptions: include_subscribers is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", subscriptions: [] } }]);
  const out = await action.execute!({ include_subscribers: "partial" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/me/subscriptions");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { include_subscribers: "partial" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { subscriptions: [] });
});

Deno.test("get-subscriptions: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", subscriptions: [{ name: "general" }] },
  }]);
  await action.execute!({}, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-subscriptions: surfaces Zulip's error msg and code", async () => {
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

Deno.test("get-subscriptions: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-subscriptions: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});
