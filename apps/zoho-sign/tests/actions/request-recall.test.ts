import { assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/request-recall.ts";

Deno.test("request-recall: POST /requests/{id}/recall with no body", async () => {
  const { ctx, calls } = mockSignCtx([
    { body: { code: 0, status: "success", message: "Document has been recalled", action_time: 1 } },
  ]);

  const out = await action.execute({ requestId: "r1" }, ctx);

  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/api/v1/requests/r1/recall");
  assertEquals(call.method, "POST");
  assertEquals(call.body, null);
  assertEquals(out, {
    code: 0,
    status: "success",
    message: "Document has been recalled",
    action_time: 1,
  });
});
