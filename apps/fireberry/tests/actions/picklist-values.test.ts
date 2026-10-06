import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/picklist-values.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("picklist-values: sends GET .../fields/{name}/values and returns the options", async () => {
  const data = { fieldName: "statuscode", values: [{ name: "Active", value: "1" }] };
  const { ctx, calls } = mockCtx([{ body: { success: true, data } }]);
  const out = await action.execute!({ objectNumber: 1, fieldName: "statuscode" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/metadata/records/1/fields/statuscode/values");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { field: data, values: [{ name: "Active", value: "1" }] });
});

Deno.test("picklist-values: returns an empty list when the field has no values", async () => {
  const { ctx } = mockCtx([{ body: { success: true, data: { fieldName: "x" } } }]);
  const out = await action.execute!({ objectNumber: 1, fieldName: "x" }, ctx) as {
    values: unknown[];
  };
  assertEquals(out.values, []);
});

Deno.test("picklist-values: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {} } }]);
  await action.execute!({ objectNumber: 1, fieldName: "x" }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("picklist-values: surfaces vendor errors", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { Message: "Invalid Record Name" } }]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 1, fieldName: "x" }, ctx),
    Error,
    "Invalid Record Name",
  );
});

Deno.test("picklist-values: declares type and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
