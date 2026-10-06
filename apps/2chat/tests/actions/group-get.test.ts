import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import groupGet from "../../actions/group-get.ts";

Deno.test("group-get: gets the group", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "WAG1", "participants": [] } },
  }]);
  await groupGet.execute!({ "groupUuid": "WAG1" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/WAG1");
  assertEquals(calls[0].body, null);
});
