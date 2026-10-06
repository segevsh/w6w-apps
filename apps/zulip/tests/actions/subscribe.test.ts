import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/subscribe.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("subscribe: subscribes the caller to named channels", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", subscribed: { "me@x.com": ["a"] }, already_subscribed: {} },
  }]);
  const out = await action.execute!({ channels: "a, b" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/me/subscriptions");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { subscriptions: '[{"name":"a"},{"name":"b"}]' });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { subscribed: { "me@x.com": ["a"] }, already_subscribed: {} });
});

Deno.test("subscribe: description and principals are applied", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", subscribed: {} } }]);
  const out = await action.execute!({
    channels: "new",
    description: "d",
    principals: "5,6",
    invite_only: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/me/subscriptions");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), {
    subscriptions: '[{"name":"new","description":"d"}]',
    principals: "[5,6]",
    invite_only: "true",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { subscribed: {} });
});

Deno.test("subscribe: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", subscribed: { "me@x.com": ["a"] }, already_subscribed: {} },
  }]);
  await action.execute!({ channels: "a, b" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("subscribe: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ channels: "a, b" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("subscribe: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ channels: "a, b" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("subscribe: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ channels: "a, b" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("subscribe: no channel names is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ channels: " " }, ctx), Error, "required");
  assertEquals(calls.length, 0);
});
