import { assertEquals } from "@std/assert";
import assistantDelete from "../../actions/assistant-delete.ts";
import { mockCtx, ok, pathOf } from "../_helpers.ts";

Deno.test("assistant-delete: DELETE /assistants/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ answer: "Assistant deleted" }) }]);
  const out = await assistantDelete.execute({ model_id: "a1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/assistants/a1");
  assertEquals(out, { answer: "Assistant deleted" });
});
