import type { ActionDefinition } from "@w6w/types";
import { YouTubeClient } from "../lib/client.ts";

interface Input {
  id: string;
  rating: "like" | "dislike" | "none";
}

/**
 * `videos.rate` — POST /youtube/v3/videos/rate
 * https://developers.google.com/youtube/v3/docs/videos/rate
 *
 * **Quota: 50 units** — a write price for what looks like a trivial call.
 *
 * No `part`: the rating is set entirely by query parameters and the method
 * returns 204 with no body, so there is no response to shape.
 *
 * `rating=none` is the *removal* operation — there is no separate unrate method.
 * Setting a rating is a set, not an increment, so retrying is safe.
 */
const rateVideo: ActionDefinition<Input> = {
  key: "rate-video",
  type: "perform",
  resource: "video",
  title: "Rate Video",
  description:
    "Like, dislike, or remove the authenticated user's rating on a video. Costs 50 quota units. Use rating `none` to remove an existing rating.",
  idempotent: true,
  params: [
    { key: "id", label: "Video ID", type: "string", required: true },
    {
      key: "rating",
      label: "Rating",
      type: "select",
      required: true,
      options: [
        { value: "like", label: "Like" },
        { value: "dislike", label: "Dislike" },
        { value: "none", label: "Remove rating" },
      ],
    },
  ],
  output: [
    { key: "rated", type: "boolean", label: "Rating applied" },
    { key: "rating", type: "string", label: "Rating that was set" },
  ],

  async execute(input, ctx) {
    const client = new YouTubeClient(ctx);
    await client.request("/videos/rate", {
      method: "POST",
      query: { id: input.id, rating: input.rating },
    });
    return { rated: true, rating: input.rating };
  },
};

export default rateVideo;
