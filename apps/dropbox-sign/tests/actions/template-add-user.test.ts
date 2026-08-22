import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-add-user.ts";

Deno.test("template-add-user: takes an email or an account id, and needs one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { template: {} } }]);
  await action.execute!({ templateId: "t1", emailAddress: "ada@example.com" }, ctx);
  assertEquals(calls[0].url, "https://api.hellosign.com/v3/template/add_user/t1");
  assertEquals(JSON.parse(calls[0].body!), { email_address: "ada@example.com" });

  const neither = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ templateId: "t1" }, neither.ctx),
    Error,
    "one of `emailAddress` or `accountId`",
  );
  assertEquals(neither.calls.length, 0);
});

Deno.test("template-add-user: skip_notification is only sent when set", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ templateId: "t1", accountId: "a1", skipNotification: true }, ctx);
  assertEquals(JSON.parse(calls[0].body!).skip_notification, true);
});

Deno.test("template-add-user: a blank template id fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await action.execute!({ emailAddress: "a@x.com" }, ctx),
    Error,
    "`templateId`",
  );
  assertEquals(calls.length, 0);
});
