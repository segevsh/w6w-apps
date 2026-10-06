import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/object-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("object-get: sends GET /metadata/records/{n} and returns data", async () => {
  const obj = { name: "Account", systemName: "account", objectType: "1" };
  const { ctx, calls } = mockCtx([{ body: { success: true, data: obj } }]);
  const out = await action.execute!({ objectNumber: 1 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/metadata/records/1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { object: obj });
});

Deno.test("object-get: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {} } }]);
  await action.execute!({ objectNumber: 1 }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("object-get: surfaces 'Invalid Record Name'", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { Message: "Invalid Record Name" } }]);
  await assertRejects(
    async () => await action.execute!({ objectNumber: 99999 }, ctx),
    Error,
    "Invalid Record Name",
  );
});

Deno.test("object-get: declares type and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
