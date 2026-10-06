import { assertEquals } from "@std/assert";
import imageCreate from "../../actions/image-create.ts";
import { assertRejects, errorBody, mockCtx, pathOf } from "../_helpers.ts";

const queued = (url: string) => ({
  status: 200,
  body: { id: 7, status: "queued", [url]: null, polling_url: "https://api.placid.app/x" },
});

Deno.test("image-create: POSTs template, layers and folds options into modifications", async () => {
  const { ctx, calls } = mockCtx([queued("image_url")]);
  const out = await imageCreate.execute({
    template_uuid: " tpl1 ",
    layers: '{"title":{"text":"Hi"}}',
    webhook_success: "https://h.example/x",
    create_now: false,
    passthrough: '["a"]',
    width: 800,
    image_format: "webp",
    dpi: 150,
    transfer: { to: "s3", bucket: "b" },
  }, ctx) as { id: number };
  assertEquals(out.id, 7);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/images");
  assertEquals(JSON.parse(calls[0].body!), {
    template_uuid: "tpl1",
    layers: { title: { text: "Hi" } },
    webhook_success: "https://h.example/x",
    create_now: false,
    passthrough: ["a"],
    modifications: { width: 800, image_format: "webp", dpi: 150 },
    transfer: { to: "s3", bucket: "b" },
  });
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("image-create: no modifications key when none set; template is required; 422 surfaces", async () => {
  const { ctx, calls } = mockCtx([queued("image_url")]);
  await imageCreate.execute({ template_uuid: "t" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { template_uuid: "t" });
  await assertRejects(() => imageCreate.execute({ template_uuid: " " }, mockCtx().ctx));
  const bad = mockCtx([{
    status: 422,
    body: { ...errorBody("invalid"), errors: { layers: ["bad"] } },
  }]);
  await assertRejects(() => imageCreate.execute({ template_uuid: "t" }, bad.ctx));
  await assertRejects(() =>
    imageCreate.execute({ template_uuid: "t", layers: "{x" }, mockCtx().ctx)
  );
});
