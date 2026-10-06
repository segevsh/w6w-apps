import type { ActionDefinition } from "@w6w/types";
import { compact, encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
  body: string;
}

const reviewResponseCreate: ActionDefinition<Input> = {
  key: "review-response-create",
  type: "perform",
  resource: "review",
  title: "Respond to Review",
  description: "Post a public response to a review. Requires scope `write_reviews`.",
  idempotent: false,
  params: [{
    key: "uid",
    label: "Review UID",
    type: "string",
    required: true,
  }, {
    key: "body",
    label: "Response",
    type: "text",
    required: true,
  }],
  output: [{
    key: "body",
    type: "string",
    label: "Body of the message",
  }, {
    key: "isDeleted",
    type: "boolean",
    label: "Indicate whether the review response is deleted",
  }, {
    key: "likeCount",
    type: "number",
    label: "Number of likes the review response has received",
  }, {
    key: "publishDate",
    type: "string",
    label: "When the review response was published",
  }, {
    key: "siteAuthorName",
    type: "string",
    label: "Name of the author of the site",
  }, {
    key: "source",
    type: "string",
    label: "Source of the review response",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for review_response",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/reviews/${encodeId(input.uid)}/responses`, {
      method: "POST",
      body: compact({
        body: input.body,
      }),
    });
  },
};

export default reviewResponseCreate;
