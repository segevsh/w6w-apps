import { assertEquals } from "@std/assert";
import action from "../../actions/contact-number-add.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-number-add: POSTs an array with an integer number", async () => {
  const { ctx, calls } = mockCtx([{ body: "ok" }]);
  const out = await action.execute!({ contactId: 5, number: "+33612345678", type: "mobile" }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/contacts/5/numbers");
  assertEquals(JSON.parse(calls[0].body!), [{ number: 33612345678, type: "mobile" }]);
  assertEquals(out, { added: true });
  assertEquals(action.idempotent, false);
});
