import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/upload-media.ts";

Deno.test("upload-media: POSTs token and crop_mask", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({
    uploadToken: "abc",
    cropX: 1,
    cropY: 2,
    cropWidth: 3,
    cropHeight: 4,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/media/upload/");
  assertEquals(JSON.parse(calls[0].body!), {
    upload_token: "abc",
    crop_mask: { top_left: { x: 1, y: 2 }, width: 3, height: 4 },
  });
});

Deno.test("upload-media: token only", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ uploadToken: "abc" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { upload_token: "abc" });
});
