import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-message-flags.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("update-message-flags: marks messages as read", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", messages: [4, 5] } }]);
  const out = await action.execute!({ messages: "4, 5", op: "add", flag: "read" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages/flags");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { messages: "[4,5]", op: "add", flag: "read" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { messages: [4, 5] });
});

Deno.test("update-message-flags: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", messages: [4, 5] } }]);
  await action.execute!({ messages: "4, 5", op: "add", flag: "read" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("update-message-flags: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ messages: "4, 5", op: "add", flag: "read" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("update-message-flags: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ messages: "4, 5", op: "add", flag: "read" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("update-message-flags: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ messages: "4, 5", op: "add", flag: "read" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-message-flags: no ids and non-numeric ids are refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ messages: "", op: "add", flag: "read" }, ctx),
    Error,
    "required",
  );
  await assertRejects(
    async () => await action.execute!({ messages: "4,x", op: "add", flag: "read" }, ctx),
    Error,
    "not an integer id",
  );
  assertEquals(calls.length, 0);
});
