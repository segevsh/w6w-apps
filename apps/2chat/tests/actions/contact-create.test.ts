import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import contactCreate from "../../actions/contact-create.ts";

test("contact-create: sends contact_detail built from the typed fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "contact": { "uuid": "CON1" } } }]);
  await contactCreate.execute!(
    {
      "firstName": "2Chat",
      "lastName": "Support",
      "phone": "+17137157533",
      "whatsappPhone": "+17137157533",
      "email": "s@2chat.co",
      "channelUuid": "WPN1",
    } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/contacts");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "first_name": "2Chat",
    "last_name": "Support",
    "channel_uuid": "WPN1",
    "contact_detail": [{ "type": "PH", "value": "+17137157533" }, {
      "type": "WAPH",
      "value": "+17137157533",
    }, { "type": "E", "value": "s@2chat.co" }],
  });
});

test("contact-create: refuses a contact with no details", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await contactCreate.execute!({ "firstName": "A" } as never, ctx);
  });
  assert.ok(err.message.includes("at least one"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("contact-create: refuses a contact with no first name", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await contactCreate.execute!({ "phone": "+1" } as never, ctx);
  });
  assert.ok(err.message.includes("first name"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
