import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import labelsAdd from "../../actions/labels-add.ts";

Deno.test("labels-add: PUTs the split label list", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "labels": [] } } }]);
  const out = await labelsAdd.execute!({ "chatId": 4, "labels": "vip, hot\nnew" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/chats/4/labels");
  assertEquals(JSON.parse(calls[0].body!), { "labels": ["vip", "hot", "new"] });
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("labels-add: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await labelsAdd.execute!({ "chatId": 4, "labels": "vip, hot\nnew" } as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});

Deno.test("labels-add: refuses an empty label list, before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => {
    await labelsAdd.execute!({ chatId: 4, labels: " , " } as never, ctx);
  }, Error);
  assertEquals(calls.length, 0);
});
