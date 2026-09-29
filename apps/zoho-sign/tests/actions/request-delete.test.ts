import { assert, assertEquals } from "@std/assert";
import { mockSignCtx } from "../_helpers.ts";
import action from "../../actions/request-delete.ts";

Deno.test("request-delete: PUT /requests/{id}/delete with flat multipart fields, no data envelope", async () => {
  const { ctx, calls } = mockSignCtx([
    { body: { code: 0, status: "success", message: "Document deleted successfully" } },
  ]);

  const out = await action.execute(
    { requestId: "r1", recallInProgress: true, reason: "wrong doc" },
    ctx,
  );

  const call = calls[0];
  assertEquals(new URL(call.url).pathname, "/api/v1/requests/r1/delete");
  assertEquals(call.method, "PUT");
  assert(call.headers["content-type"]?.startsWith("multipart/form-data; boundary="));
  assert(call.body!.includes('name="recall_inprogress"'));
  assert(call.body!.includes("true"));
  assert(call.body!.includes('name="reason"'));
  assert(call.body!.includes("wrong doc"));
  assert(!call.body!.includes('name="data"'), "delete must NOT wrap fields in a data= envelope");
  assertEquals(out, { code: 0, status: "success", message: "Document deleted successfully" });
});
