import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-answer.ts";

Deno.test("delete-answer: DELETEs /v1/locations/{id}/questions/{qid}/answers:delete", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
  const result = await action.execute({ locationId: "1", questionId: "2" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v1/locations/1/questions/2/answers:delete");
  assertEquals(result, { success: true });
});
