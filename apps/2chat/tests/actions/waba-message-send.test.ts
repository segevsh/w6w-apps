import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import wabaMessageSend from "../../actions/waba-message-send.ts";

Deno.test("waba-message-send: sends a session text", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { "success": true, "batched": true, "message_uuid": "MSG1" },
  }]);
  const out = await wabaMessageSend.execute!(
    { "fromNumber": "+5215512345432", "toNumber": "+595981048477", "text": "hola" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assertEquals(JSON.parse(calls[0].body!), {
    "from_number": "+5215512345432",
    "to_number": "+595981048477",
    "text": "hola",
  });
  assertEquals((out as { message_uuid: string }).message_uuid, "MSG1");
});

Deno.test("waba-message-send: sends a template with positional body and a button value", async () => {
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
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assertEquals(JSON.parse(calls[0].body!), {
    "from_number": "+1",
    "to_number": "+2",
    "template_uuid": "TMP1",
    "params": { "body": ["Maria", "TRK-1"], "button": ["a1b2c3"] },
  });
});

Deno.test("waba-message-send: sends params as an empty object for a variable-less template", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "batched": true, "message_uuid": "MSG3" },
  }]);
  await wabaMessageSend.execute!(
    { "fromNumber": "+1", "toNumber": "+2", "templateUuid": "TMP1" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assertEquals(JSON.parse(calls[0].body!), {
    "from_number": "+1",
    "to_number": "+2",
    "template_uuid": "TMP1",
    "params": {},
  });
});

Deno.test("waba-message-send: passes named-variable bodies and header media", async () => {
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
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/waba/send-message");
  assertEquals(JSON.parse(calls[0].body!), {
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

Deno.test("waba-message-send: refuses text and template together", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await wabaMessageSend.execute!(
      { "fromNumber": "+1", "toNumber": "+2", "text": "x", "templateUuid": "TMP1" } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("not both"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("waba-message-send: refuses neither", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await wabaMessageSend.execute!({ "fromNumber": "+1", "toNumber": "+2" } as never, ctx);
  }, Error);
  assert(err.message.includes("needs `text`"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("waba-message-send: surfaces the vendor error_code for a closed window", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      "error": true,
      "error_code": "WABA_WINDOW_CLOSED",
      "error_message": "The 24-hour customer service window for this contact is closed.",
    },
  }]);
  const err = await assertRejects(async () => {
    await wabaMessageSend.execute!(
      { "fromNumber": "+1", "toNumber": "+2", "text": "x" } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("WABA_WINDOW_CLOSED"), err.message);
  assert(err.message.includes("HTTP 422"), err.message);
});
