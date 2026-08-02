import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-email-with-template.ts";

Deno.test("send-email-with-template: POSTs /email/withTemplate with TemplateAlias + TemplateModel", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { To: "bob@x.com", SubmittedAt: "now", MessageID: "abc", ErrorCode: 0, Message: "OK" },
  }]);
  await action.execute(
    {
      from: "ada@x.com",
      to: "bob@x.com",
      templateAlias: "welcome",
      templateModel: { name: "Bob" },
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/email/withTemplate");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.TemplateAlias, "welcome");
  assertEquals(body.TemplateId, undefined);
  assertEquals(body.TemplateModel, { name: "Bob" });
});

Deno.test("send-email-with-template: accepts templateId instead of templateAlias", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    { from: "ada@x.com", to: "bob@x.com", templateId: 12345, templateModel: {} },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.TemplateId, 12345);
});

Deno.test("send-email-with-template: throws when neither templateId nor templateAlias is set", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () =>
      Promise.resolve(
        action.execute({ from: "ada@x.com", to: "bob@x.com", templateModel: {} }, ctx),
      ),
    Error,
    "templateId",
  );
});
