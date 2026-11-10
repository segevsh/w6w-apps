import { anyEventTrigger } from "../lib/triggers.ts";

export default anyEventTrigger({
  key: "any-event",
  title: "Any Event",
  description:
    "Fires on any change Meta delivers for the Page fields you list in Fields (feed, mention, ratings, live_videos, videos, group_feed; empty = all). The run gets the field, item, verb, IDs, sender, message and the raw change.",
  sample: {
    "pageId": "104059235640000",
    "field": "mention",
    "item": "post",
    "verb": "add",
    "postId": "104059235640000_2204490000000001",
    "commentId": null,
    "parentId": null,
    "senderId": "5100000000000001",
    "senderName": "Alex Example",
    "message": "Loving @YourPage",
    "createdTime": 1731139200,
    "value": {
      "from": { "id": "5100000000000001", "name": "Alex Example" },
      "item": "post",
      "verb": "add",
      "post_id": "104059235640000_2204490000000001",
      "message": "Loving @YourPage",
      "created_time": 1731139200,
    },
  },
});
