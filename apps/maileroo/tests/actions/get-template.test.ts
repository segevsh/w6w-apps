import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-template.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-template: maps html and plaintext", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      data: {
        id: 789,
        type: "html",
        template_name: "Welcome",
        preview_image: "",
        preview_url: "",
        processed: 1,
        html: "<h1>Hello {{name}}</h1>",
        plaintext: "Hello {{name}}",
      },
    },
  }]);
  const out = await run(action, { templateId: 789 }, ctx);
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/templates/789");
  assertEquals([out.templateName, out.html, out.plaintext], [
    "Welcome",
    "<h1>Hello {{name}}</h1>",
    "Hello {{name}}",
  ]);
});

Deno.test("get-template: 404 throws", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { error: { message: "Template not found" } } }]);
  await assertRejects(() => run(action, { templateId: 1 }, ctx), Error, "Template not found");
});
