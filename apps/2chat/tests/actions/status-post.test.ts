import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import statusPost from "../../actions/status-post.ts";

Deno.test("status-post: posts a styled text status", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await statusPost.execute!(
    {
      "number": "+595981048477",
      "type": "text",
      "text": "oiko!",
      "backgroundColor": "#0275d8",
      "font": 10,
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-text-status/+595981048477");
  assertEquals(JSON.parse(calls[0].body!), {
    "text": "oiko!",
    "params": { "backgroundColor": "#0275d8", "font": 10 },
  });
});

Deno.test("status-post: posts a bare text status without a params object", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await statusPost.execute!(
    { "number": "+595981048477", "type": "text", "text": "hi" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-text-status/+595981048477");
  assertEquals(JSON.parse(calls[0].body!), { "text": "hi" });
});

Deno.test("status-post: posts an image status with image_url", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await statusPost.execute!(
    { "number": "+595981048477", "type": "image", "mediaUrl": "https://f/a.webp" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-image-status/+595981048477");
  assertEquals(JSON.parse(calls[0].body!), { "image_url": "https://f/a.webp" });
});

Deno.test("status-post: posts a video status with video_url", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await statusPost.execute!(
    { "number": "+595981048477", "type": "video", "mediaUrl": "https://f/a.mp4" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-video-status/+595981048477");
  assertEquals(JSON.parse(calls[0].body!), { "video_url": "https://f/a.mp4" });
});

Deno.test("status-post: refuses media statuses with no URL", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await statusPost.execute!({ "number": "+595981048477", "type": "image" } as never, ctx);
  }, Error);
  assert(err.message.includes("mediaUrl"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});

Deno.test("status-post: refuses an unknown type", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await assertRejects(async () => {
    await statusPost.execute!({ "number": "+595981048477", "type": "audio" } as never, ctx);
  }, Error);
  assert(err.message.includes("type must be"), err.message);
  assertEquals(calls.length, 0, "must not reach the network");
});
