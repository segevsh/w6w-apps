import { assertEquals } from "@std/assert";
import action from "../../actions/contact-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-update: PUTs the mandatory fields; numbers omitted when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: { firstname: "Ada" } }]);
  await action.execute!({
    contactId: 5,
    firstname: "Ada",
    lastname: "L",
    company: "Acme",
    isShared: false,
  }, ctx);
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/contacts/5");
  assertEquals(calls[0].method, "PUT");
  assertEquals(JSON.parse(calls[0].body!), {
    firstname: "Ada",
    lastname: "L",
    company: "Acme",
    is_shared: false,
  });
  assertEquals(action.idempotent, true);
});

Deno.test("contact-update: numbers are coerced to integers", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    contactId: 5,
    firstname: "A",
    lastname: "B",
    company: "C",
    isShared: true,
    numbers: [{ number: "+33 1", type: "office" }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).numbers, [{ number: 331, type: "office" }]);
});
