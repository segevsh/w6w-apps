import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import groupParticipantsUpdate from "../../actions/group-participants-update.ts";

Deno.test("group-participants-update: adds participants", async () => {
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
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/WAG1/add-participant");
  assertEquals(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "participants": ["+44", "+17"],
  });
});

Deno.test("group-participants-update: promotes by path suffix", async () => {
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
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/WAG1/promote-participant");
  assertEquals(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "participants": ["+44"],
  });
});

Deno.test("group-participants-update: refuses an unknown operation", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await groupParticipantsUpdate.execute!(
      {
        "groupUuid": "WAG1",
        "fromNumber": "+595981048477",
        "operation": "ban",
        "participants": "+1",
      } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("operation must be"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("group-participants-update: refuses more than 10 participants", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await groupParticipantsUpdate.execute!(
      {
        "groupUuid": "WAG1",
        "fromNumber": "+595981048477",
        "operation": "remove",
        "participants": "+10,+11,+12,+13,+14,+15,+16,+17,+18,+19,+110",
      } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("at most 10"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("group-participants-update: refuses an empty list", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await groupParticipantsUpdate.execute!(
      {
        "groupUuid": "WAG1",
        "fromNumber": "+595981048477",
        "operation": "demote",
        "participants": "",
      } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("must not be empty"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});
