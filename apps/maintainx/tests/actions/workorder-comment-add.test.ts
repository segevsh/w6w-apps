import { assertEquals } from "@std/assert";
import commentAdd from "../../actions/workorder-comment-add.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("workorder-comment-add: POST /v1/workorders/{id}/comments with { content }", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 90 } }]);
  const out = await commentAdd.execute({ workOrderId: 8, content: "Parts arrived" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/workorders/8/comments");
  assertEquals(bodyOf(calls[0]), { content: "Parts arrived" });
  assertEquals(out, { id: 90 });
  assertEquals(commentAdd.idempotent, false);
});
