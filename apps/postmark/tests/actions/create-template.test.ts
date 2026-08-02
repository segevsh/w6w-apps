import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-template.ts";

Deno.test("create-template: POSTs /templates with Name/Subject/HtmlBody and default TemplateType", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { TemplateId: 1, Name: "Welcome", Active: true },
  }]);
  await action.execute(
    { name: "Welcome", subject: "Hi {{name}}", htmlBody: "<p>Hi</p>" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/templates");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.Name, "Welcome");
  assertEquals(body.Subject, "Hi {{name}}");
  assertEquals(body.HtmlBody, "<p>Hi</p>");
  assertEquals(body.TemplateType, "Standard");
});

Deno.test("create-template: throws when neither htmlBody nor textBody is provided", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute({ name: "Welcome" }, ctx)),
    Error,
    "htmlBody",
  );
});

Deno.test("create-template: forwards alias, templateType, and layoutTemplate for a Layout", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    {
      name: "Main Layout",
      htmlBody: "<html>{{{ @content }}}</html>",
      alias: "main-layout",
      templateType: "Layout",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.Alias, "main-layout");
  assertEquals(body.TemplateType, "Layout");
  assertEquals(body.Subject, undefined);
});
