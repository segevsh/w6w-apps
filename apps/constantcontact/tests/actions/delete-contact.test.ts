import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-contact.ts";

Deno.test("delete-contact: DELETEs /v3/contacts/{id} and reports success", async () => {
  const { ctx, calls } = mockCtx([{ status: 204, headers: {} }]);
  const out = await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/c1");
  assertEquals(calls[0].body, null);
  assertEquals(out, { success: true });
});

Deno.test("delete-contact: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
