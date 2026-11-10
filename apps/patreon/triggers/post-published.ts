import { webhookTrigger } from "../lib/triggers.ts";

/** A post is published on the campaign. */
const postPublished = webhookTrigger({
  key: "post-published",
  title: "Post Published",
  description:
    "Fires when a post is published on a Patreon campaign. The run gets the post resource: title, URL, publish time and the campaign it belongs to.",
  trigger: "posts:publish",
  sample: {
    trigger: "posts:publish",
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

export default postPublished;
