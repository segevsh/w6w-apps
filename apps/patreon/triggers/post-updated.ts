import { webhookTrigger } from "../lib/triggers.ts";

/** Patreon trigger `posts:update`. */
const postUpdated = webhookTrigger({
  key: "post-updated",
  title: "Post Updated",
  description:
    "Fires when a post on the campaign is updated on a Patreon campaign (trigger posts:update). The post resource: title, URL, publish time and the campaign it belongs to.",
  trigger: "posts:update",
  sample: {
    trigger: "posts:update",
    resourceType: "post",
    resourceId: "55512345",
    campaignId: "123456",
    attributes: {
      title: "Behind the scenes",
      url: "/posts/behind-the-scenes-55512345",
      is_public: false,
      published_at: "2026-11-10T09:00:00.000+00:00",
    },
    relationships: { campaign: { data: { id: "123456", type: "campaign" } } },
    included: [],
  },
});

export default postUpdated;
