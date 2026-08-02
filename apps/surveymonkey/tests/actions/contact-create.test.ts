import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-create.ts";

Deno.test("contact-create: POSTs /contact_lists/{id}/contacts with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "ct1", email: "a@b.co" } }]);
  const result = await action.execute(
    { contactListId: "l1", firstName: "Ada", lastName: "Lovelace", email: "a@b.co" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contact_lists/l1/contacts");
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Ada",
    last_name: "Lovelace",
    email: "a@b.co",
  });
  assertEquals(result, { id: "ct1", email: "a@b.co" });
});

Deno.test("contact-create: supports phone number instead of email", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "ct2" } }]);
  await action.execute(
    { contactListId: "l1", firstName: "Ada", lastName: "Lovelace", phoneNumber: "+15551234567" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    first_name: "Ada",
    last_name: "Lovelace",
    phone_number: "+15551234567",
  });
});
