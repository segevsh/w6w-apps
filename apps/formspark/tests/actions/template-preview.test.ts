import { assertEquals, assertRejects } from "@std/assert";
import templatePreview from "../../actions/template-preview.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-preview: POST .../preview with data wrapped, returns html and text", async () => {
  const { ctx, calls } = mockCtx([{ body: { html: "<p>a</p>", text: "a" } }]);
  const out = await templatePreview.execute(
    { formId: "f1", kind: "notification", data: { email: "a@b.c" } },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1/templates/notification/preview");
  assertEquals(JSON.parse(calls[0].body!), { data: { email: "a@b.c" } });
  assertEquals(out, { html: "<p>a</p>", text: "a" });
});

Deno.test("template-preview: no data sends {}, a JSON string is parsed, a non-object is refused", async () => {
  const a = mockCtx([{ body: {} }]);
  await templatePreview.execute({ formId: "f", kind: "autoresponder" }, a.ctx);
  assertEquals(JSON.parse(a.calls[0].body!), {});
  const b = mockCtx([{ body: {} }]);
  await templatePreview.execute({ formId: "f", kind: "autoresponder", data: '{"x":1}' }, b.ctx);
  assertEquals(JSON.parse(b.calls[0].body!), { data: { x: 1 } });
  const c = mockCtx([]);
  await assertRejects(
    async () =>
      await templatePreview.execute({ formId: "f", kind: "autoresponder", data: "[1]" }, c.ctx),
    Error,
    "JSON object",
  );
  assertEquals(c.calls.length, 0);
});
