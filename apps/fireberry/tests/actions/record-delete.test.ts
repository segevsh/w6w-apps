import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/record-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("record-delete: sends DELETE /api/record/{object}/{id} with no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: null, message: "" } }]);
  const out = await action.execute!({ object: "cases", recordId: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/record/cases/t1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
});

Deno.test("record-delete: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: null } }]);
  await action.execute!({ object: "cases", recordId: "t1" }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("record-delete: surfaces 'Invalid ids' as a thrown error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { Message: "Invalid ids" } }]);
  await assertRejects(
    async () => await action.execute!({ object: "cases", recordId: "bad" }, ctx),
    Error,
    "Invalid ids",
  );
});

Deno.test("record-delete: declares idempotency", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
