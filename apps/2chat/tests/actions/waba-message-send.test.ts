import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import wabaMessageSend from "../../actions/waba-message-send.ts";

test("waba-message-send: sends a session text", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { "success": true, "batched": true, "message_uuid": "MSG1" },
  }]);
  const out = await wabaMessageSend.execute!(
    { "fromNumber": "+5215512345432", "toNumber": "+595981048477", "text": "hola" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+5215512345432",
    "to_number": "+595981048477",
    "text": "hola",
  });
  assert.deepStrictEqual((out as { message_uuid: string }).message_uuid, "MSG1");
});

test("waba-message-send: sends a template with positional body and a button value", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { "success": true, "batched": true, "message_uuid": "MSG2" },
  }]);
  await wabaMessageSend.execute!(
    {
      "fromNumber": "+1",
      "toNumber": "+2",
      "templateUuid": "TMP1",
      "bodyParams": '["Maria","TRK-1"]',
      "buttonParams": ["a1b2c3"],
    } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+1",
    "to_number": "+2",
    "template_uuid": "TMP1",
    "params": { "body": ["Maria", "TRK-1"], "button": ["a1b2c3"] },
  });
});

test("waba-message-send: sends params as an empty object for a variable-less template", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "batched": true, "message_uuid": "MSG3" },
  }]);
  await wabaMessageSend.execute!(
    { "fromNumber": "+1", "toNumber": "+2", "templateUuid": "TMP1" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+1",
    "to_number": "+2",
    "template_uuid": "TMP1",
    "params": {},
  });
});

test("waba-message-send: passes named-variable bodies and header media", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "batched": true, "message_uuid": "M" },
  }]);
  await wabaMessageSend.execute!(
    {
      "fromNumber": "+1",
      "toNumber": "+2",
      "templateUuid": "TMP1",
      "bodyParams": { "customer_name": "Ana" },
      "headerMediaUrl": "https://f/a.pdf",
      "headerMediaFilename": "a.pdf",
    } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+1",
    "to_number": "+2",
    "template_uuid": "TMP1",
    "params": {
      "body": { "customer_name": "Ana" },
      "header_media_url": "https://f/a.pdf",
      "header_media_filename": "a.pdf",
    },
  });
});

test("waba-message-send: refuses text and template together", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await wabaMessageSend.execute!(
      { "fromNumber": "+1", "toNumber": "+2", "text": "x", "templateUuid": "TMP1" } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("not both"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("waba-message-send: refuses neither", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await wabaMessageSend.execute!({ "fromNumber": "+1", "toNumber": "+2" } as never, ctx);
  });
  assert.ok(err.message.includes("needs `text`"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("waba-message-send: surfaces the vendor error_code for a closed window", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      "error": true,
      "error_code": "WABA_WINDOW_CLOSED",
      "error_message": "The 24-hour customer service window for this contact is closed.",
    },
  }]);
  const err = await rejects(async () => {
    await wabaMessageSend.execute!(
      { "fromNumber": "+1", "toNumber": "+2", "text": "x" } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("WABA_WINDOW_CLOSED"), err.message);
  assert.ok(err.message.includes("HTTP 422"), err.message);
});
