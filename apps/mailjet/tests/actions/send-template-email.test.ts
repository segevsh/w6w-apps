import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-template-email.ts";

const OK = { body: { Messages: [{ Status: "success" }] } };

Deno.test("send-template-email: sends TemplateID on the v3.1 endpoint", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ from: "a@x.com", to: "b@x.com", templateId: 123 }, ctx);
  assertEquals(calls[0].url, "https://api.mailjet.com/v3.1/send");
  assertEquals(JSON.parse(calls[0].body!).Messages[0].TemplateID, 123);
});

Deno.test("send-template-email: TemplateLanguage defaults to true", async () => {
  // Without it Mailjet delivers `{{var:...}}` as literal text — a silent failure,
  // so the safe default is the one that interpolates.
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ from: "a@x.com", to: "b@x.com", templateId: 1 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).Messages[0].TemplateLanguage, true);
});

Deno.test("send-template-email: TemplateLanguage can be explicitly disabled", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!(
    { from: "a@x.com", to: "b@x.com", templateId: 1, templateLanguage: false },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).Messages[0].TemplateLanguage, false);
});

Deno.test("send-template-email: omits Subject so the template's own subject wins", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!({ from: "a@x.com", to: "b@x.com", templateId: 1 }, ctx);
  assert(!("Subject" in JSON.parse(calls[0].body!).Messages[0]));
});

Deno.test("send-template-email: an explicit subject overrides the template's", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!(
    { from: "a@x.com", to: "b@x.com", templateId: 1, subject: "Override" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).Messages[0].Subject, "Override");
});

Deno.test("send-template-email: forwards Variables for placeholder substitution", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!(
    { from: "a@x.com", to: "b@x.com", templateId: 1, variables: { name: "Ada", n: 3 } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).Messages[0].Variables, { name: "Ada", n: 3 });
});

Deno.test("send-template-email: reuses the shared address parsing", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!(
    { from: "Ada <a@x.com>", to: "b@x.com, c@x.com", templateId: 1, replyTo: "r@x.com" },
    ctx,
  );
  const msg = JSON.parse(calls[0].body!).Messages[0];
  assertEquals(msg.From, { Email: "a@x.com", Name: "Ada" });
  assertEquals(msg.To.length, 2);
  assertEquals(msg.ReplyTo, { Email: "r@x.com" });
});

Deno.test("send-template-email: sandbox mode rides on the envelope", async () => {
  const { ctx, calls } = mockCtx([OK]);
  await action.execute!(
    { from: "a@x.com", to: "b@x.com", templateId: 1, sandboxMode: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).SandboxMode, true);
});
