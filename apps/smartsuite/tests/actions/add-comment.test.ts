import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/add-comment.ts";

const MESSAGE = { data: { type: "doc", content: [{ type: "paragraph" }] } };

Deno.test("add-comment: POSTs the SmartDoc message with the record query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "cm1" } }]);
  const result = await action.execute!({ recordId: "rec1", message: MESSAGE }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/comments/");
  assertEquals(url.searchParams.get("record"), "rec1");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { message: MESSAGE });
  assertEquals(result, { id: "cm1" });
});

Deno.test("add-comment: maps assignedTo to the assigned_to body key", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ recordId: "rec1", message: MESSAGE, assignedTo: "mem1" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { message: MESSAGE, assigned_to: "mem1" });
});

Deno.test("add-comment: omits assigned_to when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ recordId: "rec1", message: MESSAGE, assignedTo: "" }, ctx);
  assertEquals("assigned_to" in JSON.parse(calls[0].body!), false);
});
