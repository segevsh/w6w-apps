import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/update-message.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("update-message: edits content with a PATCH form body", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  const out = await action.execute!({ message_id: 9, content: "new" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages/9");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { content: "new" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, {});
});

Deno.test("update-message: moves a message to another channel and topic", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  const out = await action.execute!({
    message_id: 9,
    topic: "t2",
    stream_id: 4,
    propagate_mode: "change_all",
    send_notification_to_old_thread: false,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages/9");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), {
    topic: "t2",
    stream_id: "4",
    propagate_mode: "change_all",
    send_notification_to_old_thread: "false",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, {});
});

Deno.test("update-message: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "" } }]);
  await action.execute!({ message_id: 9, content: "new" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("update-message: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () => await action.execute!({ message_id: 9, content: "new" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("update-message: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({ message_id: 9, content: "new" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("update-message: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({ message_id: 9, content: "new" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("update-message: nothing to change is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ message_id: 9 }, ctx),
    Error,
    "at least one of",
  );
  assertEquals(calls.length, 0);
});
