import { assertEquals } from "@std/assert";
import { mockBiginCtx, recordResult } from "../_helpers.ts";
import action from "../../actions/contact-update.ts";

Deno.test("contact-update: PUTs to the record path with the id in the documented body", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: recordResult("42") }]);
  await action.execute({ recordId: "42", fields: { Phone: "+1 555 0100" } }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/bigin/v2/Contacts/42");
  assertEquals(JSON.parse(calls[0].body ?? ""), { data: [{ id: "42", Phone: "+1 555 0100" }] });
});
