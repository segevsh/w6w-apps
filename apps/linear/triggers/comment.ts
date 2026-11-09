import { webhookTrigger } from "../lib/triggers.ts";

/** A comment created, edited or removed. */
const comment = webhookTrigger({
  key: "comment",
  title: "Comment Event",
  description:
    "Fires when a comment on an issue is created, updated or removed. The run gets the action and the comment.",
  resourceType: "Comment",
  output: [
    { key: "data.body", type: "string", label: "Comment text" },
    { key: "data.issueId", type: "string", label: "Issue ID" },
    { key: "data.userId", type: "string", label: "Author ID" },
  ],
  sampleData: {
    id: "77217de3-fb52-4dad-bb9a-b356beb93de8",
    body: "Indeed, I think this is definitely an improvement over the previous version.",
    issueId: "539068e2-ae88-4d09-bd75-22eb4a59612f",
    userId: "aacdca22-6266-4c0a-ab3c-8fa70a26765c",
  },
});

export default comment;
