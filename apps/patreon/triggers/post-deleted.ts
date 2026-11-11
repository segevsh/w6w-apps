import { webhookTrigger } from "../lib/triggers.ts";

/** Patreon trigger `posts:delete`. */
const postDeleted = webhookTrigger({
  key: "post-deleted",
  title: "Post Deleted",
  description:
    "Fires when a post on the campaign is deleted on a Patreon campaign (trigger posts:delete). The post resource: title, URL and the campaign it belonged to.",
  trigger: "posts:delete",
  sample: {
    trigger: "posts:delete",
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

export default postDeleted;
