import { assertEquals } from "@std/assert";
import action from "../../actions/contact-number-delete.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-number-delete: DELETEs the number path", async () => {
  const { ctx, calls } = mockCtx([{ status: 201 }]);
  const out = await action.execute!({ contactId: 5, number: "+33 6 12" }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/contacts/5/numbers/33612");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, { deleted: true });
  assertEquals(action.idempotent, true);
});
