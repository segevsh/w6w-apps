import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/unsubscribe.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("unsubscribe: sends names as a JSON array in the form body", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", removed: ["a"], not_removed: ["b"] },
  }]);
  const out = await action.execute!({ channels: "a,b" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/me/subscriptions");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { subscriptions: '["a","b"]' });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { removed: ["a"], not_removed: ["b"] });
});

Deno.test("unsubscribe: principals are forwarded", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", removed: ["a"], not_removed: [] },
  }]);
  const out = await action.execute!({ channels: "a", principals: "5" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/users/me/subscriptions");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { subscriptions: '["a"]', principals: "[5]" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { removed: ["a"], not_removed: [] });
});

Deno.test("unsubscribe: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", removed: ["a"], not_removed: ["b"] },
  }]);
  await action.execute!({ channels: "a,b" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("unsubscribe: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ channels: "a,b" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("unsubscribe: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ channels: "a,b" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("unsubscribe: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ channels: "a,b" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("unsubscribe: no channel names is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({ channels: "" }, ctx), Error, "required");
  assertEquals(calls.length, 0);
});
