import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import contactCreate from "../../actions/contact-create.ts";
import { mockCtx, ok } from "../_helpers.ts";

test("contact-create: POST /contacts with metadata parsed", async () => {
  const { ctx, calls } = mockCtx([{ body: ok({ id: "ct2" }) }]);
  const out = await contactCreate.execute(
    { name: "Ada", phone_number: "+1415", contact_metadata: '{"company":"Acme"}' },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Ada",
    phone_number: "+1415",
    contact_metadata: { company: "Acme" },
  });
  assertEquals(out, { id: "ct2" });
});
