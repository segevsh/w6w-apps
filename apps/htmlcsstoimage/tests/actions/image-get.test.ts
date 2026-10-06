import { assertEquals, assertRejects } from "@std/assert";
import imageGet from "../../actions/image-get.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-get: GETs the plural metadata route and returns the body", async () => {
  const meta = {
    image_type: "html_css",
    id: "i1",
    created_at: "2026-10-01T00:00:00Z",
    html: "<b/>",
  };
  const { ctx, calls } = mockCtx([{ body: meta }]);
  const out = await imageGet.execute({ imageId: "i1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1/images/i1");
  assertEquals(out, meta);
});

Deno.test("image-get: requires an id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await imageGet.execute({ imageId: "" }, ctx), Error, "imageId");
  assertEquals(calls.length, 0);
});

Deno.test("image-get: a 404 surfaces the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Not Found", "Image not found", 404) }]);
  const err = await assertRejects(async () => await imageGet.execute({ imageId: "x" }, ctx), Error);
  assertEquals(err.message.includes("Image not found"), true);
});
