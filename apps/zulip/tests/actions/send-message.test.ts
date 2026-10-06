import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-message.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";
const form = (body: string | null) => Object.fromEntries(new URLSearchParams(body ?? ""));

Deno.test("send-message: channel message maps to POST /messages with a raw channel name", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", id: 42, message_url: "/u" },
  }]);
  const out = await action.execute!(
    { type: "channel", to: "general", content: "hi", topic: "t1" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { type: "stream", to: "general", content: "hi", topic: "t1" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { id: 42, message_url: "/u" });
});

Deno.test("send-message: direct message JSON-encodes numeric user ids and drops the topic", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", id: 7 } }]);
  const out = await action.execute!({
    type: "direct",
    to: "9, 10",
    content: "yo",
    topic: "ignored",
    read_by_sender: true,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), {
    type: "direct",
    to: "[9,10]",
    content: "yo",
    read_by_sender: "true",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { id: 7 });
});

Deno.test("send-message: direct message to emails sends a JSON string array", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", id: 8 } }]);
  const out = await action.execute!({ type: "direct", to: "a@x.com,b@x.com", content: "yo" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages");
  assertEquals(calls[0].method, "POST");
  assertEquals(url.search, "");
  assertEquals(form(calls[0].body), { type: "direct", to: '["a@x.com","b@x.com"]', content: "yo" });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(out, { id: 8 });
});

Deno.test("send-message: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", id: 42, message_url: "/u" },
  }]);
  await action.execute!({ type: "channel", to: "general", content: "hi", topic: "t1" }, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("send-message: surfaces Zulip's error msg and code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { result: "error", msg: "Invalid parameter", code: "BAD_REQUEST" },
  }]);
  await assertRejects(
    async () =>
      await action.execute!({ type: "channel", to: "general", content: "hi", topic: "t1" }, ctx),
    Error,
    "HTTP 400 — Invalid parameter [BAD_REQUEST]",
  );
});

Deno.test("send-message: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () =>
      await action.execute!({ type: "channel", to: "general", content: "hi", topic: "t1" }, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("send-message: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () =>
      await action.execute!({ type: "channel", to: "general", content: "hi", topic: "t1" }, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-message: a blank recipient is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ type: "direct", to: " , ", content: "x" }, ctx),
    Error,
    "`to` is required",
  );
  assertEquals(calls.length, 0);
});
