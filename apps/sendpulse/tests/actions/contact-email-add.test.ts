import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-email-add.ts";

test("contact-email-add: POSTs a single-element emails array", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ email: "a@b.com" }] } }]);
  await action.execute!({ contactId: 7, email: "a@b.com" }, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/contacts/7/emails");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body ?? ""), {
    emails: [{ email: "a@b.com", isMain: false }],
  });
});

test("contact-email-add: isMain true is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ contactId: 7, email: "a@b.com", isMain: true }, ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.emails[0].isMain, true);
});
