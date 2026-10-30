import { test } from "node:test";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import action from "../../actions/field-get.ts";
import { mockCtx } from "../_helpers.ts";

test("field-get: sends GET /metadata/records/{n}/fields/{name} and returns data", async () => {
  const f = { label: "Account Name", fieldName: "accountname" };
  const { ctx, calls } = mockCtx([{ body: { success: true, data: f } }]);
  const out = await action.execute!({ objectNumber: 1, fieldName: "accountname" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/metadata/records/1/fields/accountname");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { field: f });
});

test("field-get: percent-encodes the field name", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {} } }]);
  await action.execute!({ objectNumber: 1, fieldName: "a b" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/metadata/records/1/fields/a%20b");
});

test("field-get: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {} } }]);
  await action.execute!({ objectNumber: 1, fieldName: "x" }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

test("field-get: surfaces vendor errors", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { Message: "Invalid Record Name" } }]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, fieldName: "x" }, ctx),
    Error,
    "Invalid Record Name",
  );
});

test("field-get: declares type and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
