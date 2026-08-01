import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-file.ts";

Deno.test("delete-file: DELETEs /files/{id} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const result = await action.execute!({ fileId: "123" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/2.0/files/123");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(result, { success: true, fileId: "123" });
});
