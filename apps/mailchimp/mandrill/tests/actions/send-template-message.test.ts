import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-template-message.ts";

Deno.test("send-template-message: POSTs /messages/send-template.json with template_name and message.to", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ email: "bob@x.com", status: "sent" }] }]);
  await action.execute!(
    { templateName: "welcome-email", to: "bob@x.com" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/1.0/messages/send-template.json");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.template_name, "welcome-email");
  assertEquals(body.template_content, []);
  assertEquals(body.message.to, [{ email: "bob@x.com", type: "to" }]);
  assertEquals(body.async, false);
});

Deno.test("send-template-message: forwards template content, merge vars, and merge language", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    {
      templateName: "welcome-email",
      to: "bob@x.com",
      templateContent: [{ name: "body", content: "<p>Hi</p>" }],
      mergeLanguage: "handlebars",
      globalMergeVars: [{ name: "FNAME", content: "Bob" }],
      mergeVars: [{ rcpt: "bob@x.com", vars: [{ name: "FNAME", content: "Bob" }] }],
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.template_content, [{ name: "body", content: "<p>Hi</p>" }]);
  assertEquals(body.merge_language, "handlebars");
  assertEquals(body.message.global_merge_vars, [{ name: "FNAME", content: "Bob" }]);
  assertEquals(body.message.merge_vars, [
    { rcpt: "bob@x.com", vars: [{ name: "FNAME", content: "Bob" }] },
  ]);
});

Deno.test("send-template-message: overrides from/subject only when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    { templateName: "t", to: "bob@x.com", fromEmail: "ada@x.com", subject: "Custom" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.message.from_email, "ada@x.com");
  assertEquals(body.message.subject, "Custom");
});
