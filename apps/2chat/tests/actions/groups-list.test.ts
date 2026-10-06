import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import groupsList from "../../actions/groups-list.ts";

Deno.test("groups-list: lists groups for the number", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "data": [{ "uuid": "WAG1" }] } }]);
  await groupsList.execute!({ "phoneNumber": "+595981048477" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/groups/+595981048477");
  assertEquals(calls[0].body, null);
});
