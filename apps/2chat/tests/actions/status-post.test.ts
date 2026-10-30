import assert from "node:assert/strict";
import { test } from "node:test";
import { mockCtx, rejects } from "../_helpers.ts";
import statusPost from "../../actions/status-post.ts";

test("status-post: posts a styled text status", async () => {
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
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-text-status/+595981048477");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), {
    "text": "oiko!",
    "params": { "backgroundColor": "#0275d8", "font": 10 },
  });
});

test("status-post: posts a bare text status without a params object", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await statusPost.execute!(
    { "number": "+595981048477", "type": "text", "text": "hi" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-text-status/+595981048477");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), { "text": "hi" });
});

test("status-post: posts an image status with image_url", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await statusPost.execute!(
    { "number": "+595981048477", "type": "image", "mediaUrl": "https://f/a.webp" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-image-status/+595981048477");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), { "image_url": "https://f/a.webp" });
});

test("status-post: posts a video status with video_url", async () => {
  const { ctx, calls } = mockCtx([{ body: { "success": true } }]);
  await statusPost.execute!(
    { "number": "+595981048477", "type": "video", "mediaUrl": "https://f/a.mp4" } as never,
    ctx,
  );
  assert.deepStrictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].method, "POST");
  assert.deepStrictEqual(calls[0].url, "https://api.p.2chat.io/open/whatsapp/set-video-status/+595981048477");
  assert.deepStrictEqual(JSON.parse(calls[0].body!), { "video_url": "https://f/a.mp4" });
});

test("status-post: refuses media statuses with no URL", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await statusPost.execute!({ "number": "+595981048477", "type": "image" } as never, ctx);
  });
  assert.ok(err.message.includes("mediaUrl"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});

test("status-post: refuses an unknown type", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await rejects(async () => {
    await statusPost.execute!({ "number": "+595981048477", "type": "audio" } as never, ctx);
  });
  assert.ok(err.message.includes("type must be"), err.message);
  assert.deepStrictEqual(calls.length, 0, "must not reach the network");
});
