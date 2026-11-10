import { webhookTrigger } from "../lib/triggers.ts";

export default webhookTrigger({
  key: "comment-created",
  title: "Comment Created",
  description:
    "Fires when a comment or reply is added in the Webflow Designer. The run gets the comment text, its author and the mentioned users (Webflow can delay this by up to five minutes).",
  triggerType: "comment_created",
});
