import { assertEquals, assertRejects } from "@std/assert";
import imageCreateTemplate from "../../actions/image-create-template.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-create-template: POSTs /image/{template_id} (latest) with template_values", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i3", url: "https://hcti.io/v1/image/i3" } }]);
  const out = await imageCreateTemplate.execute({
    template_id: "t-abc",
    template_values: { title: "Hello" },
    format: "jpg",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/image/t-abc");
  assertEquals(JSON.parse(calls[0].body!), { template_values: { title: "Hello" }, format: "jpg" });
  assertEquals(out, { id: "i3", url: "https://hcti.io/v1/image/i3" });
});

Deno.test("image-create-template: a version pins the route and values may arrive as a string", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "i4", url: "u" } }]);
  await imageCreateTemplate.execute({
    template_id: "t-abc",
    template_version: 1595179003987,
    template_values: '{"n":1}',
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/image/t-abc/1595179003987");
  assertEquals(JSON.parse(calls[0].body!), { template_values: { n: 1 } });
});

Deno.test("image-create-template: rejects missing id and empty/non-object values without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const run = (input: Record<string, unknown>) =>
    assertRejects(
      async () => await imageCreateTemplate.execute(input as never, ctx),
      Error,
    );
  await run({ template_id: "", template_values: { a: 1 } });
  await run({ template_id: "t", template_values: {} });
  await run({ template_id: "t", template_values: "[1]" });
  await run({ template_id: "t" });
  assertEquals(calls.length, 0);
});

Deno.test("image-create-template: not declared idempotent", () => {
  assertEquals(imageCreateTemplate.idempotent, false);
});
