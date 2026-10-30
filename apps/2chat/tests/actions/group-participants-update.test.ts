import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import groupParticipantsUpdate from "../../actions/group-participants-update.ts";

test("group-participants-update: adds participants", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "participants": {} } }]);
  await groupParticipantsUpdate.execute!(
    {
      "groupUuid": "WAG1",
      "fromNumber": "+595981048477",
      "operation": "add",
      "participants": "+44\n+17",
    } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/WAG1/add-participant");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "participants": ["+44", "+17"],
  });
});

test("group-participants-update: promotes by path suffix", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "participants": { "statusCode": 200 } },
  }]);
  await groupParticipantsUpdate.execute!(
    {
      "groupUuid": "WAG1",
      "fromNumber": "+595981048477",
      "operation": "promote",
      "participants": ["+44"],
    } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/WAG1/promote-participant");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "participants": ["+44"],
  });
});

test("group-participants-update: refuses an unknown operation", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await groupParticipantsUpdate.execute!(
      {
        "groupUuid": "WAG1",
        "fromNumber": "+595981048477",
        "operation": "ban",
        "participants": "+1",
      } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("operation must be"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("group-participants-update: refuses more than 10 participants", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await groupParticipantsUpdate.execute!(
      {
        "groupUuid": "WAG1",
        "fromNumber": "+595981048477",
        "operation": "remove",
        "participants": "+10,+11,+12,+13,+14,+15,+16,+17,+18,+19,+110",
      } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("at most 10"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("group-participants-update: refuses an empty list", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await groupParticipantsUpdate.execute!(
      {
        "groupUuid": "WAG1",
        "fromNumber": "+595981048477",
        "operation": "demote",
        "participants": "",
      } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("must not be empty"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
