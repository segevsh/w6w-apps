import { assertEquals, assertRejects } from "@std/assert";
import { mockBiginCtx } from "../_helpers.ts";
import action from "../../actions/task-get.ts";

Deno.test("task-get: GETs one record and unwraps the data array", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [{ id: "42", Last_Name: "Brooks" }] } }]);
  const record = await action.execute({ recordId: "42" }, ctx) as { id: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/bigin/v2/Tasks/42");
  assertEquals(record.id, "42");
});

Deno.test("task-get: sends no `fields` query parameter when none was asked for", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: { data: [{ id: "42" }] } }]);
  await action.execute({ recordId: "42" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("task-get: throws when Bigin answers 200 with no record", async () => {
  const { ctx } = mockBiginCtx([{ body: { data: [] } }]);
  await assertRejects(() => Promise.resolve(action.execute({ recordId: "42" }, ctx)), Error);
});
