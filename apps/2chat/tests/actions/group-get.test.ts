import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx } from "../_helpers.ts";
import groupGet from "../../actions/group-get.ts";

test("group-get: gets the group", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "data": { "uuid": "WAG1", "participants": [] } },
  }]);
  await groupGet.execute!({ "groupUuid": "WAG1" } as never, ctx);
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "GET");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/group/WAG1");
  assert.deepStrictEqual(calls[0].body, null);
});
