import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import groupCreate from "../../actions/group-create.ts";

test("group-create: nests the group fields under `group`", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "group": { "uuid": "WAG1", "unaccepted_numbers": [] } },
  }]);
  await groupCreate.execute!(
    {
      "fromNumber": "+595981048477",
      "name": "G",
      "description": "d",
      "participants": "+1713, +1864",
    } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/create");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "group": { "name": "G", "description": "d", "participants": ["+1713", "+1864"] },
  });
});

test("group-create: refuses more than 10 participants", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await groupCreate.execute!(
      {
        "fromNumber": "+595981048477",
        "name": "G",
        "participants": "+10,+11,+12,+13,+14,+15,+16,+17,+18,+19,+110",
      } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("at most 10"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("group-create: refuses an empty participant list", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await groupCreate.execute!(
      { "fromNumber": "+595981048477", "name": "G", "participants": " " } as never,
      ctx,
    );
  });
  assert.ok(err.message.includes("at least one"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
