import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/record-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("record-get: sends GET /api/record/{object}/{id} and unwraps data.Record", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { Record: { contactid: "c1", lastname: "Doe" } }, message: "" },
  }]);
  const out = await action.execute!({ object: "contact", recordId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/record/contact/c1");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { record: { contactid: "c1", lastname: "Doe" } });
});

Deno.test("record-get: percent-encodes the path segments", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: {} } }]);
  const out = await action.execute!({ object: "a/b", recordId: "x y" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/record/a%2Fb/x%20y");
  assertEquals(out, { record: null });
});

Deno.test("record-get: sends no tokenid header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, data: { Record: {} } } }]);
  await action.execute!({ object: "contact", recordId: "c1" }, ctx);
  assert(!("tokenid" in calls[0].headers));
});

Deno.test("record-get: an empty-bodied 401 still throws with the status", async () => {
  const { ctx } = mockCtx([{ status: 401 }]);
  await assertRejects(
    async () => await action.execute!({ object: "contact", recordId: "c1" }, ctx),
    Error,
    "HTTP 401",
  );
});

Deno.test("record-get: declares type and output", () => {
  assertEquals(action.type, "read");
  assert(Array.isArray(action.output) && action.output.length > 0);
});
