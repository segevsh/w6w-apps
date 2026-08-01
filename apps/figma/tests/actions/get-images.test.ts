import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-images.ts";

Deno.test("get-images: GETs /v1/images/{key} with ids and format", async () => {
  const { ctx, calls } = mockCtx([{ body: { images: { "1:2": "https://x/1.png" } } }]);
  await action.execute({ fileKey: "abc123", ids: "1:2", format: "png", scale: 2 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/images/abc123");
  assertEquals(url.searchParams.get("ids"), "1:2");
  assertEquals(url.searchParams.get("format"), "png");
  assertEquals(url.searchParams.get("scale"), "2");
});

Deno.test("get-images: forwards svg-only options using Figma's snake_case names", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    fileKey: "abc123",
    ids: "1:2",
    format: "svg",
    svgIncludeId: true,
    svgSimplifyStroke: false,
    useAbsoluteBounds: true,
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("svg_include_id"), "true");
  assertEquals(params.get("svg_simplify_stroke"), "false");
  assertEquals(params.get("use_absolute_bounds"), "true");
});
