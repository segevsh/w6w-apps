import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import contactGet from "../../actions/contact-get.ts";

Deno.test("contact-get: gets the contact by uuid", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "success": true, "contact": { "uuid": "CON58147f7c" } },
  }]);
  await contactGet.execute!({ "contactUuid": "CON58147f7c" } as never, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/contacts/CON58147f7c");
  assertEquals(calls[0].body, null);
});

Deno.test("contact-get: refuses an empty uuid before the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await contactGet.execute!({ "contactUuid": "" } as never, ctx);
  }, Error);
  assert(err.message.includes("empty"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});
