import { assertEquals } from "@std/assert";
import action from "../../actions/contact-update.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("contact-update: PATCHes parsed emails", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "c1" } } }]);
  await action.execute!({
    id: "c1",
    emails: '[{"email":"a@b.com","is_primary":true}]',
    name: "Ada",
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/contacts/c1");
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Ada",
    emails: [{ email: "a@b.com", is_primary: true }],
  });
});

Deno.test("contact-update: an empty account ID is sent so the contact leaves its account", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "c1", accountId: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { account_id: "" });
});
