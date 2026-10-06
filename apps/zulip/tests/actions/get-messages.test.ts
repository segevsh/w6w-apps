import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-messages.ts";
import { mockCtx } from "../_helpers.ts";

const BASE = "https://acme.zulipchat.com/api/v1";

Deno.test("get-messages: defaults to the newest 20 messages as Markdown", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", messages: [{ id: 1 }], found_newest: true },
  }]);
  const out = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    anchor: "newest",
    num_before: "20",
    num_after: "0",
    apply_markdown: "false",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { messages: [{ id: 1 }], found_newest: true });
});

Deno.test("get-messages: channel and topic shortcuts become JSON narrow terms", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", messages: [] } }]);
  const out = await action.execute!({
    channel: "general",
    topic: "plans",
    anchor: 100,
    num_before: 5,
    num_after: 2,
    include_anchor: false,
    apply_markdown: true,
    narrow: '[{"operator":"sender","operand":"a@x.com"}]',
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    anchor: "100",
    num_before: "5",
    num_after: "2",
    include_anchor: "false",
    apply_markdown: "true",
    narrow:
      '[{"operator":"sender","operand":"a@x.com"},{"operator":"channel","operand":"general"},{"operator":"topic","operand":"plans"}]',
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { messages: [] });
});

Deno.test("get-messages: message_ids replaces the anchor range entirely", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", messages: [] } }]);
  const out = await action.execute!({ message_ids: "1, 2", anchor: "oldest", num_before: 9 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, BASE + "/messages");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), {
    message_ids: "[1,2]",
    apply_markdown: "false",
  });
  assertEquals(calls[0].body, null);
  assertEquals(out, { messages: [] });
});

Deno.test("get-messages: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{
    body: { result: "success", msg: "", messages: [{ id: 1 }], found_newest: true },
  }]);
  await action.execute!({}, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});

Deno.test("get-messages: surfaces Zulip's error msg and code", async () => {
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

Deno.test("get-messages: a 401 names the credential problem", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "", headers: { "content-type": "text/html" } }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "API key missing or invalid",
  );
});

Deno.test("get-messages: a connection without a subdomain is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  (ctx as { connection?: unknown }).connection = undefined;
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "no organization subdomain",
  );
  assertEquals(calls.length, 0);
});

Deno.test("get-messages: a numeric channel is sent as an ID, and a non-array narrow is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: "success", msg: "", messages: [] } }]);
  await action.execute!({ channel: "12" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("narrow"),
    '[{"operator":"channel","operand":12}]',
  );
  await assertRejects(
    async () => await action.execute!({ narrow: '{"operator":"x"}' }, ctx),
    Error,
    "JSON array",
  );
});
