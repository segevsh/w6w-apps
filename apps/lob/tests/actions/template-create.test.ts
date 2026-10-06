import { assertEquals, assertRejects } from "@std/assert";
import templateCreate from "../../actions/template-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-create: POSTs html and the snake_case options", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tmpl_1", versions: [] } }]);
  const out = await templateCreate.execute({
    html: "<p>{{name}}</p>",
    description: "Welcome",
    engine: "handlebars",
    requiredVars: '["name"]',
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/templates");
  assertEquals(bodyOf(calls[0]), {
    html: "<p>{{name}}</p>",
    description: "Welcome",
    engine: "handlebars",
    required_vars: ["name"],
  });
  assertEquals(out.id, "tmpl_1");
});

Deno.test("template-create: is declared non-idempotent", () => {
  assertEquals(templateCreate.idempotent, false);
});

Deno.test("template-create: invalid required-vars JSON is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await templateCreate.execute({ html: "x", requiredVars: "[" }, ctx),
    Error,
    "Required variables is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("template-create: Lob's error is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("invalid", "html is required", 422) }]);
  await assertRejects(
    async () => await templateCreate.execute({ html: "" }, ctx),
    Error,
    "invalid",
  );
});
