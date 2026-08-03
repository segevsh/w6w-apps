import { assertEquals } from "@std/assert";
import action from "../../actions/add-subscriber-to-form.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("add-subscriber-to-form: POSTs the email to /v4/forms/{form_id}/subscribers", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriber: { id: 1 } } }]);
  await action.execute!({ formId: 12, emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.kit.com/v4/forms/12/subscribers");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });
});

Deno.test("add-subscriber-to-form: includes the referrer only when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { subscriber: {} } }]);
  await action.execute!(
    { formId: 12, emailAddress: "ada@example.com", referrer: "https://example.com/post" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    email_address: "ada@example.com",
    referrer: "https://example.com/post",
  });
});

Deno.test("add-subscriber-to-form: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
