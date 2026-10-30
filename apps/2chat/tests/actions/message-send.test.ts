import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import messageSend from "../../actions/message-send.ts";

test("message-send: sends a text to a number", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "message_uuid": "MSG1", "batched": true },
  }]);
  const out = await messageSend.execute!(
    { "fromNumber": "+595981048477", "toNumber": "+5215512345432", "text": "hi" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/send-message");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "to_number": "+5215512345432",
    "text": "hi",
  });
  assert.deepStrictEqual((out as { message_uuid: string }).message_uuid, "MSG1");
});

test("message-send: sends media and a pin to a group", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "message_uuid": "MSG2", "batched": true },
  }]);
  await messageSend.execute!(
    {
      "fromNumber": "+595981048477",
      "toGroupUuid": "WAG1",
      "url": "https://f.example/a.png",
      "pin": { "latitude": "1", "longitude": "2" },
    } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/send-message");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "to_group_uuid": "WAG1",
    "url": "https://f.example/a.png",
    "pin": { "latitude": "1", "longitude": "2" },
  });
});

test("message-send: refuses two targets at once", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await messageSend.execute!(
      {
        "fromNumber": "+595981048477",
        "toNumber": "+1",
        "toGroupUuid": "WAG1",
        "text": "x",
      } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("exactly one"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("message-send: refuses a message with no content", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await messageSend.execute!({ "fromNumber": "+595981048477", "toNumber": "+1" } as never, ctx);
  });
  assert.ok(err.message.includes("at least one of text"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("message-send: refuses a pin without coordinates", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await messageSend.execute!(
      { "fromNumber": "+595981048477", "toNumber": "+1", "pin": { "name": "x" } } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("latitude"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
