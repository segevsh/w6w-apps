import type { ActionDefinition } from "@w6w/types";
import { encodeId, PodiumClient } from "../lib/client.ts";

interface Input {
  uid: string;
}

const reviewGet: ActionDefinition<Input> = {
  key: "review-get",
  type: "read",
  resource: "review",
  title: "Get Review",
  description: "Get one review by uid. Requires scope `read_reviews`.",
  params: [{
    key: "uid",
    label: "Review UID",
    type: "string",
    required: true,
  }],
  output: [{
    key: "attributions",
    type: "array",
    label: "attributions",
  }, {
    key: "author",
    type: "object",
    label: "Author of the review",
  }, {
    key: "createdAt",
    type: "string",
    label: "When the review was created",
  }, {
    key: "isRecommendation",
    type: "boolean",
    label: "Whether or not the review is recommendation based, as opposed to being",
  }, {
    key: "locations",
    type: "array",
    label: "locations",
  }, {
    key: "needsResponse",
    type: "boolean",
    label: "Whether or not the review needs a response",
  }, {
    key: "responses",
    type: "array",
    label: "responses",
  }, {
    key: "review",
    type: "object",
    label: "Review object",
  }, {
    key: "uid",
    type: "string",
    label: "Podium unique identifier for review",
  }, {
    key: "updatedAt",
    type: "string",
    label: "When the review was last updated",
  }],

  execute(input, ctx) {
    return new PodiumClient(ctx).one(`/reviews/${encodeId(input.uid)}`);
  },
};

export default reviewGet;
