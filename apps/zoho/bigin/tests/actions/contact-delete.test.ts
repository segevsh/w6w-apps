import { assertEquals } from "@std/assert";
import { mockBiginCtx, recordResult } from "../_helpers.ts";
import action from "../../actions/contact-delete.ts";

Deno.test("contact-delete: DELETEs the record path and unwraps the result entry", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: recordResult("42") }]);
  const result = await action.execute({ recordId: "42" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/bigin/v2/Contacts/42");
  assertEquals(result.status, "success");
});
