import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/send-templated-email.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("send-templated-email: posts template_id and template_data to /emails/template", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, message: "ok", data: { reference_id: "b".repeat(24) } },
  }]);
  const out = await run(action, {
    fromAddress: "m@d.com",
    to: "a@x.com",
    subject: "Hi {{ n }}",
    templateId: 1024,
    templateData: '{"first_name":"Jane","features":["a"]}',
  }, ctx);
  assertEquals(calls[0].url, "https://smtp.maileroo.com/api/v2/emails/template");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.template_id, 1024);
  assertEquals(sent.template_data, { first_name: "Jane", features: ["a"] });
  assertEquals(out.referenceId, "b".repeat(24));
});

Deno.test("send-templated-email: template_data is omitted when unset; a bad id throws", async () => {
  const { ctx, calls } = mockCtx([{
    body: { success: true, data: { reference_id: "c".repeat(24) } },
  }]);
  await run(action, { fromAddress: "m@d.com", to: "a@x.com", subject: "s", templateId: 5 }, ctx);
  assertEquals("template_data" in JSON.parse(calls[0].body!), false);
  await assertRejects(
    () => run(action, { fromAddress: "m@d.com", to: "a@x.com", subject: "s", templateId: 0 }, ctx),
    Error,
    "templateId",
  );
});
