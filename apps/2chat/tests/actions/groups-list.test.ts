import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import groupsList from "../../actions/groups-list.ts";

test("groups-list: lists groups for the number", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true, "data": [{ "uuid": "WAG1" }] } }]);
  await groupsList.execute!({ "phoneNumber": "+595981048477" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/groups/+595981048477");
  assert.deepStrictEqual(calls[0].body, null);
});
