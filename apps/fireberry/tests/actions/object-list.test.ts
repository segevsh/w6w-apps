import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/object-list.ts";
import { mockCtx } from "../_helpers.ts";

test("object-list: sends GET /metadata/records and returns the objects", async () => {
  const objs = [{ name: "Account", systemName: "account", objectType: "1" }];
  const { ctx, calls } = mockCtx([{ body: { success: true, data: objs, message: "" } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(
    new URL(calls[0].url).origin + new URL(calls[0].url).pathname,
    "https://api.fireberry.com/metadata/records",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { objects: objs });
});

test("object-list: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await action.execute!({}, ctx);
  assert(!("tokenid" in calls[0].headers));
});

test("object-list: a 401 throws", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "HTTP 401");
});

test("object-list: declares type and output", () => {
  assertEquals(action.type, "search");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
