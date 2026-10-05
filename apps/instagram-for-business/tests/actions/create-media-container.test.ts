import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-media-container.ts";

async function params(input: Record<string, unknown>) {
  const { ctx, calls } = mockCtx([{ body: { id: "k1" } }]);
  await action.execute!({ igUserId: "17", ...input } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v23.0/17/media");
  return Object.fromEntries(new URL(calls[0].url).searchParams);
}

Deno.test("create-media-container: photo sends image_url and no media_type", async () => {
  assertEquals(await params({ imageUrl: "https://x/a.jpg", caption: "c", altText: "alt" }), {
    image_url: "https://x/a.jpg",
    caption: "c",
    alt_text: "alt",
  });
});

Deno.test("create-media-container: reel sends REELS, video_url, share_to_feed, trial_params", async () => {
  assertEquals(
    await params({
      mediaType: "REELS",
      videoUrl: "https://x/v.mp4",
      shareToFeed: true,
      trialGraduationStrategy: "MANUAL",
    }),
    {
      media_type: "REELS",
      video_url: "https://x/v.mp4",
      share_to_feed: "true",
      trial_params: '{"graduation_strategy":"MANUAL"}',
    },
  );
});

Deno.test("create-media-container: user tags JSON-encoded and collaborators as array", async () => {
  const p = await params({
    imageUrl: "https://x/a.jpg",
    userTags: [{ username: "u", x: 0.5, y: 0.5 }],
    collaborators: "a, b",
    isCarouselItem: true,
  });
  assertEquals(p.user_tags, '[{"username":"u","x":0.5,"y":0.5}]');
  assertEquals(p.collaborators, '["a","b"]');
  assertEquals(p.is_carousel_item, "true");
});

Deno.test("create-media-container: story takes one of image or video", async () => {
  assertEquals(await params({ mediaType: "STORIES", videoUrl: "https://x/v.mp4" }), {
    media_type: "STORIES",
    video_url: "https://x/v.mp4",
  });
});

Deno.test("create-media-container: validates before any network call", async () => {
  for (
    const input of [
      {},
      { mediaType: "VIDEO" },
      { mediaType: "REELS" },
      { mediaType: "STORIES" },
      { mediaType: "STORIES", imageUrl: "a", videoUrl: "b" },
    ]
  ) {
    const { ctx, calls } = mockCtx([]);
    await assertRejects(async () =>
      await action.execute!({ igUserId: "17", ...input } as never, ctx)
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("create-media-container: not idempotent", () => assert(action.idempotent === false));
