import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/response-delete.ts";

Deno.test("response-delete: DELETEs /forms/{id}/responses with included_response_ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, headers: {} }]);
  const result = await action.execute({ formId: "abc", responseIds: "r1,r2" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/forms/abc/responses");
  assertEquals(url.searchParams.get("included_response_ids"), "r1,r2");
  assertEquals(result, { deleted: true });
});
