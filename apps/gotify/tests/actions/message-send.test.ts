import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

test("message-send: posts appid, message, title, priority and extras", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { id: 1, appid: 5, message: "hi", title: "t", priority: 4, date: "2026-01-01T00:00:00Z" },
  }], conn);
  await action.execute!({
    applicationId: 5,
    message: "hi",
    title: "t",
    priority: 4,
    extras: '{"client::display":{"contentType":"text/markdown"}}',
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://gotify.example.com/message");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.appid, 5);
  assertEquals(body.message, "hi");
  assertEquals(body.title, "t");
  assertEquals(body.priority, 4);
  assertEquals(body.extras, { "client::display": { contentType: "text/markdown" } });
});

test("message-send: omits title/priority/extras when unset, rather than sending nulls", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }], conn);
  await action.execute!({ applicationId: 5, message: "hi" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("title" in body, false);
  assertEquals("priority" in body, false);
  assertEquals("extras" in body, false);
  assertEquals(body.appid, 5);
});

test("message-send: requires a non-empty message before any fetch", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ applicationId: 5, message: "   " }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});

test("message-send: rejects extras that are not valid JSON", async () => {
  const { ctx, calls } = mockCtx([], conn);
  let threw = false;
  try {
    await action.execute!({ applicationId: 5, message: "hi", extras: "{not json" }, ctx);
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
  assertEquals(calls.length, 0);
});
