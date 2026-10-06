import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import chatsList from "../../actions/chats-list.ts";

Deno.test("chats-list: sends no filters by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": { "chats": [] } } }]);
  const out = await chatsList.execute!({} as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://app.timelines.ai/integrations/api/chats");
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("chats-list: maps every filter to its wire name, keeping false", async () => {
  const { ctx, calls } = mockCtx([{ body: { "status": "ok", "data": {} } }]);
  const out = await chatsList.execute!(
    {
      "label": "vip, hot",
      "group": false,
      "closed": false,
      "page": 2,
      "responsible": "a@b.co",
      "whatsappAccountId": "1@s.whatsapp.net",
      "withMsg": true,
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://app.timelines.ai/integrations/api/chats?label=vip%2Chot&whatsapp_account_id=1%40s.whatsapp.net&group=false&responsible=a%40b.co&closed=false&with_msg=true&page=2",
  );
  assertEquals(calls[0].body, null);
  assertEquals(
    calls[0].headers["authorization"],
    undefined,
    "credentials belong to sign, not the action",
  );
  assertEquals((out as { status: string }).status, "ok");
});

Deno.test("chats-list: surfaces a vendor error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { status: "error", message: "not found", error_code: "not_found" },
  }]);
  const err = await assertRejects(async () => {
    await chatsList.execute!({} as never, ctx);
  }, Error);
  assert(err.message.includes("not_found"), err.message);
});
