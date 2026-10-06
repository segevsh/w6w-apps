import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import groupCreate from "../../actions/group-create.ts";

Deno.test("group-create: nests the group fields under `group`", async () => {
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
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/create");
  assertEquals(JSON.parse(calls[0].body!), {
    "from_number": "+595981048477",
    "group": { "name": "G", "description": "d", "participants": ["+1713", "+1864"] },
  });
});

Deno.test("group-create: refuses more than 10 participants", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await groupCreate.execute!(
      {
        "fromNumber": "+595981048477",
        "name": "G",
        "participants": "+10,+11,+12,+13,+14,+15,+16,+17,+18,+19,+110",
      } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("at most 10"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("group-create: refuses an empty participant list", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await groupCreate.execute!(
      { "fromNumber": "+595981048477", "name": "G", "participants": " " } as never,
      ctx,
    );
  }, Error);
  assert(err.message.includes("at least one"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});
