import { assertEquals, assertRejects } from "@std/assert";
import templateCreate from "../../actions/template-create.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-create: POSTs only TemplateRequest fields and returns id + version", async () => {
  const { ctx, calls } = mockCtx([{
    body: { template_id: "t-1", template_version: 1700000000000 },
  }]);
  const out = await templateCreate.execute({
    html: "<h1>{{title}}</h1>",
    name: "Card",
    css: "h1{margin:0}",
    device_scale: 2,
    viewport_width: 1200,
    viewport_height: 630,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/template");
  assertEquals(JSON.parse(calls[0].body!), {
    html: "<h1>{{title}}</h1>",
    name: "Card",
    css: "h1{margin:0}",
    device_scale: 2,
    viewport_width: 1200,
    viewport_height: 630,
  });
  assertEquals(out, { template_id: "t-1", template_version: 1700000000000 });
});

Deno.test("template-create: html is required", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await templateCreate.execute({ html: "" }, ctx),
    Error,
    "html is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("template-create: a no-placeholder 400 surfaces; not idempotent", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("Bad Request", "Invalid", 400, [{
      path: "html",
      message: "needs a placeholder",
    }]),
  }]);
  const err = await assertRejects(
    async () => await templateCreate.execute({ html: "<p/>" }, ctx),
    Error,
  );
  assertEquals(err.message.includes("needs a placeholder"), true);
  assertEquals(templateCreate.idempotent, false);
});
