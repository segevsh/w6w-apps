import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/field-list.ts";
import { mockCtx } from "../_helpers.ts";

const F = { label: "Account Name", fieldName: "accountname", systemName: "account" };

test("field-list: sends GET /metadata/records/{n}/fields and returns an array as-is", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [F, F] } }]);
  const out = await action.execute!({ objectNumber: 1 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/metadata/records/1/fields");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { fields: [F, F] });
});

test("field-list: wraps a single documented-shape object in an array", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: F } }]);
  assertEquals(await action.execute!({ objectNumber: 1 }, ctx), { fields: [F] });
});

test("field-list: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: [] } }]);
  await action.execute!({ objectNumber: 1 }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

test("field-list: surfaces vendor errors", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { Message: "Invalid Record Name" } }]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 5 }, ctx),
    Error,
    "Invalid Record Name",
  );
});

test("field-list: declares type and output", () => {
  assertEquals(action.type, "search");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
